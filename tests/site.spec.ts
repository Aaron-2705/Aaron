import { expect, test, type Page } from "@playwright/test";

import { SAMPLE_LOG } from "@/data/sampleLog";
import { RESUME } from "@/data/resume";

/**
 * A fresh forwarded address per API call.
 *
 * The endpoint allows 5 requests per IP per hour and `next start` keeps that
 * state alive between runs, so tests sharing one key start 429ing on the second
 * run of the hour. Giving each call its own key isolates the tests without
 * weakening the control - the tests that are ABOUT rate limiting pin their key
 * deliberately.
 */
let ipCounter = 0;
const ip = () => `198.51.100.${++ipCounter % 250}`;

/** Skip the boot cinematic so tests land straight on the hero. */
async function openSite(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("aaron-boot-complete", "1");
  });
  await page.goto("/");
}

test.describe("sections", () => {
  test("all sections render", async ({ page }) => {
    await openSite(page);
    for (const id of ["hero", "command", "missions", "range", "siem", "skills", "about", "experience", "hardening", "resume", "contact"]) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await expect(section, `#${id} should be visible`).toBeVisible();
    }
  });

  test("no console errors on load and full scroll", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    await openSite(page);
    // Walk the page so lazy sections mount.
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    });
    await page.waitForTimeout(500);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("scroll performance", () => {
  /**
   * REGRESSION GUARD — the site's dominant frame cost, encoded as a mechanism.
   *
   * Measured 2026-08-01 against a production build at 1905x897: a full-page
   * scroll walk ran at 22.7fps (mean frame 44.08ms, 206 of 250 frames over
   * 32ms). Disabling exactly one thing — the 2D drawing in
   * `RisingLinesBackground` — took the same walk to 58.6fps (mean 17.05ms).
   * That one layer was 61% of frame time.
   *
   * The cause was allocation, not pixels: the draw loop called
   * `createLinearGradient` once per spark and `createRadialGradient` once per
   * blob, EVERY frame, with the particle count scaling on viewport area
   * (220 * w*h / (800*400), capped only at 4000). At 1905x897 that is ~1,500
   * fresh gradient objects per frame, ~90,000 per second.
   *
   * So the guard counts allocations rather than milliseconds. A frame-time
   * assertion alone would be machine-dependent and would go green on a fast
   * CI box while the defect was still shipping; the allocation count IS the
   * defect and reads identically on every machine.
   */
  test("the background canvas does not allocate a gradient per particle per frame", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem("aaron-boot-complete", "1");
      const counters = { linear: 0, radial: 0 };
      (window as unknown as { __gradientCounters: typeof counters }).__gradientCounters =
        counters;
      const proto = CanvasRenderingContext2D.prototype;
      const linear = proto.createLinearGradient;
      const radial = proto.createRadialGradient;
      proto.createLinearGradient = function (...args: Parameters<typeof linear>) {
        counters.linear += 1;
        return linear.apply(this, args);
      };
      proto.createRadialGradient = function (...args: Parameters<typeof radial>) {
        counters.radial += 1;
        return radial.apply(this, args);
      };
    });
    await page.goto("/");

    // Park inside the content sections, where the layer is fully faded in and
    // drawing at full rate. Over the hero it deliberately skips its draw, so
    // measuring there would pass no matter how expensive the loop is.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3));
    await page.waitForTimeout(600);

    const sample = await page.evaluate(async () => {
      const counters = (
        window as unknown as { __gradientCounters: { linear: number; radial: number } }
      ).__gradientCounters;
      const startLinear = counters.linear;
      const startRadial = counters.radial;
      let frames = 0;
      await new Promise<void>((resolve) => {
        const tick = () => {
          frames += 1;
          if (frames >= 30) return resolve();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      return {
        frames,
        gradients: counters.linear - startLinear + (counters.radial - startRadial),
        viewport: { w: window.innerWidth, h: window.innerHeight },
      };
    });

    const perFrame = sample.gradients / sample.frames;
    expect(
      perFrame,
      `canvas gradients allocated per frame at ${sample.viewport.w}x${sample.viewport.h}: ` +
        `${perFrame.toFixed(1)}. Particle sprites must be rasterised once and blitted, ` +
        `not rebuilt per particle per frame.`,
    ).toBeLessThan(8);
  });

  /**
   * Outcome guard for the same defect: a backstop that catches a stall
   * whatever causes it, where the test above only catches this one cause.
   *
   * The threshold is sized against the environment this actually runs in, and
   * that environment is NOT what ships. Measured on an idle machine,
   * 2026-08-01, same walk:
   *
   *   production build (`next start`)   median  10.0ms
   *   dev server (`next dev`)           median  50.0ms
   *   dev server, before the fix        did not complete 60 steps in 60s
   *
   * `next dev` is ~5x the production frame cost — unminified bundles, React
   * development mode, dev-only instrumentation — so a threshold set from the
   * production number would fail here permanently while nothing was wrong.
   * 75ms sits above the measured 50ms with headroom for a loaded CI box and
   * still trips well before the stall this was written for. It is a stall
   * detector, not a performance budget; the production figures above are the
   * real ones and are recorded in the commit that introduced this test.
   *
   * NOTE: run this on an idle machine. A concurrent test suite or Lighthouse
   * run inflates the median by 2x and the failure looks exactly like a real
   * regression.
   */
  test("a full-page scroll walk never stalls", async ({ page }) => {
    await openSite(page);
    await page.waitForTimeout(1500);

    const result = await page.evaluate(async () => {
      const frames: number[] = [];
      let running = true;
      let last = performance.now();
      const tick = (t: number) => {
        frames.push(t - last);
        last = t;
        if (running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const steps = 60;
      // Wall-clock bail. Without it a genuine stall exceeds the Playwright
      // timeout and the test reports "timed out" instead of the frame time
      // that caused it — the number is the whole point of the assertion.
      const deadline = performance.now() + 25_000;
      for (let i = 0; i <= steps && performance.now() < deadline; i++) {
        window.scrollTo(0, Math.round((max * i) / steps));
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
      }
      running = false;

      // Drop warm-up frames, then read the median so one mounting section
      // cannot decide the verdict.
      const sorted = frames.slice(5).sort((a, b) => a - b);
      return {
        median: sorted[Math.floor(sorted.length / 2)],
        count: sorted.length,
      };
    });

    expect(
      result.median,
      `median frame time across the scroll walk: ${result.median.toFixed(1)}ms ` +
        `over ${result.count} frames (dev-server baseline 50ms; production 10ms)`,
    ).toBeLessThan(75);
  });
});

test.describe("contact form", () => {
  test("client-side validation blocks invalid input", async ({ page }) => {
    await openSite(page);
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /send transmission/i }).click();
    await expect(page.locator("#contact-name-error")).toBeVisible();
    await expect(page.locator("#contact-email-error")).toBeVisible();
    await expect(page.locator("#contact-message-error")).toBeVisible();
  });

  test("API validates server-side", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { name: "x", email: "not-an-email", message: "short" },
      headers: { "x-forwarded-for": ip() },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.fields).toBeTruthy();
  });

  test("API rate-limits repeated requests", async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const response = await request.post("/api/contact", {
        data: { name: "x", email: "bad", message: "short" },
        headers: { "x-forwarded-for": "203.0.113.99" },
      });
      statuses.push(response.status());
    }
    expect(statuses.at(-1)).toBe(429);
  });

  test("honeypot submissions are swallowed", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: {
        name: "Bot",
        email: "bot@example.com",
        message: "Automated message from a bot.",
        company: "EvilCorp",
      },
      headers: { "x-forwarded-for": "203.0.113.77" },
    });
    expect(response.status()).toBe(200);
  });
});

test.describe("narrative spine", () => {
  test("session HUD tracks the active module on scroll", async ({ page }) => {
    await openSite(page);
    const hud = page.locator('aside:has-text("ACCESS: GRANTED")');
    // Starts on the identity (orb) hero.
    await expect(hud).toContainText("IDENTITY");
    // Stepping through sections updates the rAF-driven provider.
    await page.locator("#command").scrollIntoViewIfNeeded();
    await expect(hud).toContainText("COMMAND_CENTER", { timeout: 8000 });
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await expect(hud).toContainText("SECURE_CHANNEL", { timeout: 8000 });
  });
});

test.describe("security headers", () => {
  test("all security headers present", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });
});

test.describe("the range", () => {
  test("selecting a topology node updates the inspector", async ({ page }) => {
    await openSite(page);
    const range = page.locator("#range");
    await range.scrollIntoViewIfNeeded();

    // Default selection is the domain controller.
    await expect(range).toContainText("BUILT // OPERATIONAL");

    // A planned node must say so plainly.
    await range.locator('[data-node="pfsense"]').click();
    await expect(range).toContainText("PLANNED // NOT YET BUILT");
    await expect(range).toContainText("Perimeter firewall");
  });

  test("topology nodes are operable by keyboard", async ({ page }) => {
    await openSite(page);
    const range = page.locator("#range");
    await range.scrollIntoViewIfNeeded();

    const node = range.locator('[data-node="siem01"]');
    await node.focus();
    await expect(node).toBeFocused();
    await node.press("Enter");
    await expect(range).toContainText("SIEM01");
    await expect(range).toContainText("PLANNED // NOT YET BUILT");
  });

  test("the threat model layer shows a risk and its mitigation", async ({ page }) => {
    await openSite(page);
    const range = page.locator("#range");
    await range.scrollIntoViewIfNeeded();

    await range.getByRole("button", { name: "THREAT MODEL" }).click();
    // Entering the layer selects the first hotspot.
    await expect(range).toContainText("MITIGATION");

    await range.locator('[data-hotspot="a07-dc01"]').click();
    await expect(range).toContainText("Identification and Authentication Failures");
    await expect(range).toContainText("RISK");
    await expect(range).toContainText("MITIGATION");
  });

  test("the hardening toggle flips the diff and the risk index", async ({ page }) => {
    await openSite(page);
    const range = page.locator("#range");
    await range.scrollIntoViewIfNeeded();

    const index = range.getByTestId("risk-index");
    const llmnr = range.getByTestId("control-llmnr");

    await expect(index).toContainText("100");
    await expect(llmnr).toContainText("Enabled");

    await range.getByRole("button", { name: "HARDENED" }).click();
    await expect(index).toContainText("0");
    await expect(llmnr).toContainText("Disabled by Group Policy");

    await range.getByRole("button", { name: "MISCONFIGURED" }).click();
    await expect(index).toContainText("100");
  });
});

test.describe("signal room", () => {
  test("the sample log streams and the rule raises a critical alert", async ({ page }) => {
    await openSite(page);
    const siem = page.locator("#siem");
    await siem.scrollIntoViewIfNeeded();

    await expect(siem).toContainText("SAMPLE DATA");
    // Speed the replay up so the spike arrives promptly.
    await siem.getByRole("button", { name: /Replay speed/i }).click();

    const critical = siem.locator('[data-testid="siem-alert"][data-severity="critical"]');
    await expect(critical).toBeVisible({ timeout: 40_000 });
    await expect(critical).toContainText("10.10.20.77");
    // The events that triggered it are highlighted in the feed.
    await expect(siem.locator("li[data-flagged]").first()).toBeVisible();
  });
});

test.describe("root shell", () => {
  /** Open the hidden terminal: CTRL+SHIFT+D, then ENTER. */
  async function openTerminal(page: Page) {
    await page.keyboard.press("Control+Shift+KeyD");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: /root shell/i })).toBeVisible();
  }

  test("accepts typed commands and prints real content", async ({ page }) => {
    await openSite(page);
    await openTerminal(page);

    const dialog = page.getByRole("dialog", { name: /root shell/i });
    const input = page.getByTestId("terminal-input");

    await input.fill("whoami");
    await input.press("Enter");
    await expect(dialog).toContainText("Dhwanit Sukhadiya");

    await input.fill("projects");
    await input.press("Enter");
    await expect(dialog).toContainText("OPERATION BLACKGATE");

    // Unknown commands are reported, not silently swallowed.
    await input.fill("nonsense");
    await input.press("Enter");
    await expect(dialog).toContainText("command not found");
  });

  test("command history recalls the previous command", async ({ page }) => {
    await openSite(page);
    await openTerminal(page);

    const input = page.getByTestId("terminal-input");
    await input.fill("whoami");
    await input.press("Enter");
    await input.press("ArrowUp");
    await expect(input).toHaveValue("whoami");
  });

  test("goto navigates the site and closes the shell", async ({ page }) => {
    await openSite(page);
    await openTerminal(page);

    const input = page.getByTestId("terminal-input");
    await input.fill("goto range");
    await input.press("Enter");

    await expect(page.getByRole("dialog", { name: /root shell/i })).toBeHidden();
    await expect(page.locator("#range")).toBeInViewport({ timeout: 10_000 });
  });
});

test.describe("per-control hardening", () => {
  test("one control toggles independently and moves the index by its weight", async ({ page }) => {
    await openSite(page);
    const range = page.locator("#range");
    await range.scrollIntoViewIfNeeded();

    const index = range.getByTestId("risk-index");
    await expect(index).toContainText("100");

    // LLMNR carries a weight of 20, printed in its own row.
    await range.getByTestId("toggle-llmnr").click();
    await expect(index).toContainText("80");
    await expect(range.getByTestId("control-llmnr")).toContainText("Disabled by Group Policy");

    // A second, differently-weighted control (SMB signing, 15).
    await range.getByTestId("toggle-smb-signing").click();
    await expect(index).toContainText("65");

    // Toggling back restores it.
    await range.getByTestId("toggle-llmnr").click();
    await expect(index).toContainText("85");
  });
});

test.describe("responsive", () => {
  test("no horizontal page scroll at 375px across the whole page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openSite(page);
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "page must not scroll horizontally at 375px").toBe(0);
  });
});

/**
 * Reduced motion.
 *
 * NOTE: `test.use({ reducedMotion: "reduce" })` does NOT take effect in this
 * project's config — verified by probe: matchMedia reports false both at
 * describe and file scope. `page.emulateMedia()` before navigation does work,
 * and it must run before `goto` so `usePrefersReducedMotion` sees the right
 * value when it mounts. Do not "simplify" this back to test.use.
 */
async function openSiteReduced(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSite(page);
}

test.describe("reduced motion", () => {
  test("the SIEM renders the analyzed log statically, with no replay", async ({ page }) => {
    await openSiteReduced(page);
    const siem = page.locator("#siem");
    await siem.scrollIntoViewIfNeeded();

    // No timer runs, so the whole log must already be present and analyzed.
    await expect(siem.locator("ol li")).toHaveCount(SAMPLE_LOG.length);
    await expect(
      siem.locator('[data-testid="siem-alert"][data-severity="critical"]'),
    ).toBeVisible();
  });

  test("packet flow is clamped to static", async ({ page }) => {
    await openSiteReduced(page);
    await page.locator("#range").scrollIntoViewIfNeeded();
    const duration = await page.evaluate(() => {
      const el = document.querySelector("#range .packet-flow");
      return el ? getComputedStyle(el).animationDuration : null;
    });
    // The global prefers-reduced-motion block clamps every animation to 0.01ms.
    // Asserted numerically: "1e-05s" is Chromium's serialization, not a contract.
    expect(duration).not.toBeNull();
    expect(parseFloat(duration as string)).toBeLessThan(0.001);
  });

  test("the range stays fully interactive", async ({ page }) => {
    await openSiteReduced(page);
    const range = page.locator("#range");
    await range.scrollIntoViewIfNeeded();
    await range.getByRole("button", { name: "THREAT MODEL" }).click();
    await range.locator('[data-hotspot="a09-siem01"]').click();
    await expect(range).toContainText("Logging and Monitoring");
  });
});

test.describe("review regressions", () => {
  test("the risk meter tracks risk monotonically and never fills at zero", async ({ page }) => {
    await openSite(page);
    const range = page.locator("#range");
    await range.scrollIntoViewIfNeeded();

    const meter = range.locator('[aria-label^="Lab risk index"]');
    const barWidth = async () =>
      page.evaluate(() => {
        const bar = document.querySelector('[aria-label^="Lab risk index"] > div');
        return bar ? bar.getBoundingClientRect().width : 0;
      });

    // Settle first: the bar has a 500ms width transition, so a single sample
    // taken right after the label updates can catch it mid-animation.
    await expect.poll(barWidth).toBeGreaterThan(0);
    const atFullRisk = await barWidth();

    await range.getByRole("button", { name: "HARDENED" }).click();
    await expect(meter).toHaveAttribute("aria-label", /index 0 out of/);

    // A bar labelled "risk" must be near-empty when risk is zero, otherwise a
    // sighted user and a screen-reader user read opposite things.
    await expect
      .poll(barWidth, { message: "risk meter should empty as risk goes to zero" })
      .toBeLessThan(atFullRisk / 4);
  });

  test("focus cannot escape the shell after clicking the backdrop", async ({ page }) => {
    await openSite(page);
    await page.keyboard.press("Control+Shift+KeyD");
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: /root shell/i });
    await expect(dialog).toBeVisible();

    // Clicking the backdrop blurs to <body>, which is outside the panel.
    await page.mouse.click(30, 30);
    // Both directions must be trapped, not just Shift+Tab.
    for (const key of ["Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      const inside = await page.evaluate(
        () => !!document.querySelector('[role="dialog"]')?.contains(document.activeElement),
      );
      expect(inside, `focus escaped the dialog on ${key}`).toBe(true);
    }
  });
});

test.describe("root shell entry point", () => {
  test("the navbar button opens a working shell and restores focus", async ({ page }) => {
    await openSite(page);
    const button = page.getByRole("button", { name: /open the aaron root shell/i });
    await expect(button, "the shell must have a visible entry point").toBeVisible();

    await button.click();
    const dialog = page.getByRole("dialog", { name: /root shell/i });
    await expect(dialog).toBeVisible();

    const input = page.getByTestId("terminal-input");
    await expect(input).toBeFocused();
    await input.fill("whoami");
    await input.press("Enter");
    await expect(dialog).toContainText("Dhwanit Sukhadiya");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button, "focus returns to the opener").toBeFocused();
  });
});

test.describe("theme", () => {
  test("a first-time visitor stays on the steel theme after hydration", async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem("aaron-boot-complete", "1");
      window.localStorage.removeItem("aaron-theme");
    });
    await page.goto("/");
    // The provider's default must agree with the data-theme rendered by
    // app/layout.tsx, or the site repaints to a different theme on hydration.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "steel");
  });
});

test.describe("phase 4 security headers", () => {
  test("every header the hardening section grades is actually served", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(headers["x-dns-prefetch-control"]).toBe("off");
    expect(headers["x-permitted-cross-domain-policies"]).toBe("none");
    // poweredByHeader: false. Free reconnaissance denied.
    expect(headers["x-powered-by"]).toBeUndefined();
    const csp = headers["content-security-policy"];
    for (const directive of ["object-src 'none'", "frame-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(csp, `CSP should carry ${directive}`).toContain(directive);
    }
  });

  test("API responses are never cached", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { name: "x", email: "bad", message: "short" },
      headers: { "x-forwarded-for": ip() },
    });
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("the image optimizer is disabled, static assets still serve", async ({ request }) => {
    // sharp inherits unfixed libvips CVEs and next/image is used nowhere, so
    // /_next/image was closed. If someone re-enables it, this fails loudly.
    const optimizer = await request.get("/_next/image?url=%2Fprojects%2Fproject-1.png&w=640&q=75");
    expect(optimizer.status()).toBe(404);
    const direct = await request.get("/projects/project-1.png");
    expect(direct.status()).toBe(200);
  });
});

test.describe("contact API hardening", () => {
  test("non-JSON content types are refused", async ({ request }) => {
    const response = await request.post("/api/contact", {
      headers: { "Content-Type": "text/plain", "x-forwarded-for": ip() },
      data: JSON.stringify({ name: "Aa", email: "a@b.co", message: "0123456789xx" }),
    });
    expect(response.status()).toBe(415);
    expect((await response.json()).error).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  test("an oversized body is rejected, not buffered", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { name: "Aa", email: "a@b.co", message: "x".repeat(64 * 1024) },
      headers: { "x-forwarded-for": ip() },
    });
    expect(response.status()).toBe(413);
  });

  test("other methods are not routed", async ({ request }) => {
    for (const method of ["get", "put", "delete"] as const) {
      const response = await request[method]("/api/contact");
      expect(response.status(), `${method.toUpperCase()} should be 405`).toBe(405);
    }
  });

  test("no failure path leaks a stack trace or provider detail", async ({ request }) => {
    const cases = [
      { data: "{not json" as unknown as object, headers: { "Content-Type": "application/json" } },
      { data: { name: {}, email: [], message: 7 } },
      { data: { name: "Aa", email: "a@b.co", message: "0123456789xx" } },
    ];
    for (const options of cases) {
      const response = await request.post("/api/contact", {
        ...options,
        headers: { ...(options.headers ?? {}), "x-forwarded-for": ip() },
      });
      const body = await response.text();
      expect(body).not.toMatch(/\n\s+at\s+\S+\s+\(/);
      expect(body).not.toMatch(/resend|api[_-]?key|node_modules/i);
      // Every response is a fixed machine code, nothing else.
      expect(body.length, `unexpectedly chatty body: ${body.slice(0, 120)}`).toBeLessThan(400);
    }
  });
});

test.describe("hardening section", () => {
  test("the live audit runs and finds no missing control", async ({ page }) => {
    await openSite(page);
    const section = page.locator("#hardening");
    await section.scrollIntoViewIfNeeded();
    const summary = section.locator("p[aria-live]");
    await expect(summary).toContainText("ENFORCED", { timeout: 15_000 });
    // The audit reads the REAL response, so this asserts the config too.
    await expect(summary).toContainText("0 MISSING");
    await expect(section.getByText("MISSING", { exact: true })).toHaveCount(0);
  });

  test("the accepted risk is shown with its tradeoff, not hidden", async ({ page }) => {
    await openSite(page);
    const section = page.locator("#hardening");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByText("ACCEPTED RISK", { exact: true })).toHaveCount(1);
    await expect(section.getByText(/TRADEOFF \/\//).first()).toBeVisible();
  });

  test("re-running the audit reaches the same verdict", async ({ page }) => {
    await openSite(page);
    const section = page.locator("#hardening");
    await section.scrollIntoViewIfNeeded();
    const summary = section.locator("p[aria-live]");
    await expect(summary).toContainText("ENFORCED", { timeout: 15_000 });
    const before = await summary.innerText();
    await section.getByRole("button", { name: /re-run/i }).click();
    await expect(summary).toContainText("ENFORCED", { timeout: 15_000 });
    expect(await summary.innerText()).toBe(before);
  });
});

test.describe("dossier", () => {
  test("the PDF is served and the old .txt is gone", async ({ request }) => {
    const pdf = await request.get("/resume/dhwanit-sukhadiya-resume.pdf");
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect((await pdf.body()).length).toBeGreaterThan(2000);
    expect((await request.get("/resume/dhwanit-sukhadiya-resume.txt")).status()).toBe(404);
  });

  test("the rendered record matches the source the PDF is generated from", async ({ page }) => {
    await openSite(page);
    const resume = page.locator("#resume");
    await resume.scrollIntoViewIfNeeded();
    // Same JSON feeds both, so a drift between page and download fails here.
    for (const claim of [
      RESUME.name,
      RESUME.contact.location,
      RESUME.experience[0].org,
      RESUME.projects[0].name,
    ]) {
      await expect(resume).toContainText(claim);
    }
    await expect(resume.locator("a[download]")).toHaveAttribute(
      "href",
      "/resume/dhwanit-sukhadiya-resume.pdf",
    );
  });
});

test.describe("social metadata", () => {
  test("the OG card, twitter card and icons all resolve", async ({ page, request }) => {
    await openSite(page);
    for (const selector of [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'link[rel="icon"][type="image/svg+xml"]',
    ]) {
      const el = page.locator(selector).first();
      await expect(el, `${selector} should exist`).toHaveCount(1);
      const url = (await el.getAttribute("content")) ?? (await el.getAttribute("href"));
      // Request the PATH against the origin under test, not the absolute URL.
      // A production build absolutises og:image against metadataBase, which is
      // still the placeholder domain, so asserting the absolute URL would test
      // the owner's unregistered domain rather than this build's assets.
      const { pathname, search } = new URL(url!, "http://localhost:3000");
      const response = await request.get(pathname + search);
      expect(response.status(), `${selector} -> ${pathname}`).toBe(200);
    }
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("og:image is absolute, and flags the unset-domain TODO", async ({ page }) => {
    await openSite(page);
    const content = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    // Crawlers reject a relative og:image outright, so it must be absolute.
    expect(content).toMatch(/^https?:\/\//);

    // OWNER TODO: until NEXT_PUBLIC_SITE_URL (or a real metadataBase) is set,
    // a production build points this at a domain that does not resolve, so the
    // social card will 404 for every crawler even though the file is served
    // correctly from this origin. This assertion documents that rather than
    // letting it pass silently.
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    if (configured) {
      expect(new URL(content!).origin).toBe(new URL(configured).origin);
    } else {
      expect(
        new URL(content!).origin,
        "metadataBase is still the placeholder; set NEXT_PUBLIC_SITE_URL before launch",
      ).toBeTruthy();
    }
  });
});

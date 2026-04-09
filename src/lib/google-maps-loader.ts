let googleMapsPromise: Promise<typeof google> | null = null;

function withCallback(url: string) {
  const cbName = "__kaloodaMapsInit";
  return `${url}&callback=${cbName}`;
}

export function loadGoogleMaps(language: "en" | "ar"): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-kalooda-google-maps="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load maps")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    const baseUrl =
      "https://maps.googleapis.com/maps/api/js?libraries=places&loading=async";
    script.src = withCallback(`${baseUrl}&key=${encodeURIComponent(apiKey)}&language=${language}`);
    script.async = true;
    script.defer = true;
    script.dataset.kaloodaGoogleMaps = "true";
    (window as Window & { __kaloodaMapsInit?: () => void }).__kaloodaMapsInit = () => {
      resolve(window.google);
    };
    script.onerror = () => reject(new Error("Failed to load maps"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

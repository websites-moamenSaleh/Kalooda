# Issue #115 QA checklist (EN + AR)

- [ ] Account page shows saved addresses list, add form, edit flow, delete flow.
- [ ] User cannot save more than 5 addresses (UI and API both reject with clear message).
- [ ] Setting one address as default unsets previous default.
- [ ] Deleting default address promotes another saved address as default.
- [ ] Checkout (delivery) preselects default address and submits with lat/lng.
- [ ] Checkout (delivery) can add a new address inline and immediately select it.
- [ ] Checkout blocks submit when delivery coordinates are missing.
- [ ] Pickup flow renders map marker from configured business coordinates.
- [ ] If pickup coordinates are missing, localized fallback text is shown (no broken map).
- [ ] Geolocation permission denial shows localized guidance to use search/autocomplete.
- [ ] Google Maps script is loaded only when map/autocomplete interactions are opened/focused.
- [ ] All new labels/messages appear correctly in English and Arabic.
- [ ] RTL layout remains correct for new address and map controls.

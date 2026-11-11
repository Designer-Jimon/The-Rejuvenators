export const CHURCH_NAME = "IT IS FINISHED REVIVAL OUTREACH INTERNATIONAL";
export const CHURCH_SHORT_NAME = "IT IS FINISHED";
export const CHURCH_TAGLINE = "Provoking Revival";
export const CHURCH_LOGO_PATH = "/api/branding/logo";
export const CHURCH_DESCRIPTION = `${CHURCH_NAME} - ${CHURCH_TAGLINE}. A Christ-centred family provoking revival through worship, the Word and service.`;
export const DAILY_MEAL_NAME = "Daily Meal";
export const DAILY_MEAL_PDF_PREFIX =
  "IT-IS-FINISHED-REVIVAL-OUTREACH-INTERNATIONAL-DAILY-MEAL";

export function churchNameLines(name?: string | null) {
  const value = name?.trim() || CHURCH_NAME;
  const suffix = / INTERNATIONAL$/i.test(value) ? "INTERNATIONAL" : null;
  const base = suffix ? value.replace(/\s+INTERNATIONAL$/i, "") : value;
  const match = base.match(/^(.*?)\s+(REVIVAL OUTREACH.*)$/i);
  if (match) {
    return [match[1], match[2], ...(suffix ? [suffix] : [])];
  }
  return [...base.split(/\s+/).filter(Boolean), ...(suffix ? [suffix] : [])];
}

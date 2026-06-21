// Format datetime ISO string into readable format
export function formatDate(isoString) {
  if (!isoString) return "";
  const options = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  const date = new Date(isoString);
  return date.toLocaleDateString('it-IT', options).replace(',', ' -');
}

// Mapping for team names to ISO codes (lower case)
const flagCodes = {
  "messico": "mx", "sudafrica": "za", "corea del sud": "kr", "repubblica ceca": "cz",
  "canada": "ca", "bosnia ed erzegovina": "ba", "stati uniti": "us", "paraguay": "py",
  "qatar": "qa", "svizzera": "ch", "brasile": "br", "marocco": "ma", "germania": "de",
  "curaçao": "cw", "curacao": "cw", "giappone": "jp", "costa d'avorio": "ci", "ecuador": "ec",
  "svezia": "se", "tunisia": "tn", "spagna": "es", "capo verde": "cv", "belgio": "be",
  "egitto": "eg", "arabia saudita": "sa", "uruguay": "uy", "iran": "ir",
  "nuova zelanda": "nz", "francia": "fr", "senegal": "sn", "iraq": "iq",
  "norvegia": "no", "argentina": "ar", "algeria": "dz", "austria": "at",
  "giordan": "jo", "giordania": "jo", "portogallo": "pt", "rd congo": "cd",
  "inghilterra": "gb-eng", "croazia": "hr", "ghana": "gh", "panama": "pa",
  "uzbekistan": "uz", "colombia": "co", "italia": "it", "olanda": "nl",
  "australia": "au", "scozia": "gb-sct", "turchia": "tr", "haiti": "ht"
};
Object.freeze(flagCodes);

// Get flag representation (img tag from Flagcdn or fallback emoji)
export function getFlagEmoji(teamName) {
  if (!teamName) return "⚽";
  const key = teamName.trim().toLowerCase();
  
  const code = flagCodes[key];
  if (code) {
    return `<img src="https://flagcdn.com/w40/${code}.png" class="flag-img" alt="${teamName}" loading="lazy">`;
  }
  return "⚽";
}

// Return outcome sign ('1', 'X', '2')
export function getSign(home, away) {
  if (home === null || away === null) return null;
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}

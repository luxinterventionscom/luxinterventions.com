// Lien vidéo (YouTube, TikTok, Instagram, Facebook, Vimeo) ou musique (Spotify, Deezer, Apple Music, SoundCloud)
// → lecteur intégré (« mini écran » / petit lecteur audio) ; null si non reconnu
export function videoEmbed(link) {
  let u;
  try { u = new URL(String(link || '').trim().replace(/^www\./, 'https://www.')); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const h = u.hostname.replace(/^(www|m|mobile)\./, ''), p = u.pathname;
  let m;
  if (h === 'youtu.be' && (m = p.match(/^\/([\w-]{6,20})/))) return { src: `https://www.youtube-nocookie.com/embed/${m[1]}`, name: 'YouTube', tall: false };
  if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
    if ((m = p.match(/^\/shorts\/([\w-]{6,20})/))) return { src: `https://www.youtube-nocookie.com/embed/${m[1]}`, name: 'YouTube', tall: true };
    if ((m = p.match(/^\/(?:embed|live)\/([\w-]{6,20})/))) return { src: `https://www.youtube-nocookie.com/embed/${m[1]}`, name: 'YouTube', tall: false };
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{6,20}$/.test(v)) return { src: `https://www.youtube-nocookie.com/embed/${v}`, name: 'YouTube', tall: false };
  }
  if (h === 'tiktok.com' && (m = p.match(/\/video\/(\d{8,25})/))) return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, name: 'TikTok', tall: true };
  if (h === 'instagram.com' && (m = p.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]{5,40})/))) return { src: `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed`, name: 'Instagram', tall: true };
  if ((h === 'facebook.com' && /\/(videos|reel|watch)\b/.test(p + u.search)) || h === 'fb.watch') return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.href)}&show_text=false`, name: 'Facebook', tall: /\/reel\//.test(p) };
  if (h === 'vimeo.com' && (m = p.match(/^\/(\d{5,12})/))) return { src: `https://player.vimeo.com/video/${m[1]}`, name: 'Vimeo', tall: false };
  // musique : petit lecteur audio (hauteur fixe)
  if (h === 'open.spotify.com' && (m = p.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,40})/))) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, name: 'Spotify', audio: m[1] === 'track' || m[1] === 'episode' ? 152 : 352 };
  if ((h === 'deezer.com' || h === 'deezer.page.link') && (m = p.match(/\/(track|album|playlist|artist)\/(\d{3,20})/))) return { src: `https://widget.deezer.com/widget/auto/${m[1]}/${m[2]}`, name: 'Deezer', audio: m[1] === 'track' ? 150 : 300 };
  if (h === 'music.apple.com' && /^\/[a-z]{2}\/(album|playlist|song|artist)\//.test(p)) return { src: `https://embed.music.apple.com${p}${u.search}`, name: 'Apple Music', audio: u.searchParams.get('i') || /\/song\//.test(p) ? 175 : 450 };
  if (h === 'soundcloud.com' && /^\/[\w-]+\/[\w-]+/.test(p)) return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent('https://soundcloud.com' + p)}&visual=false&show_comments=false`, name: 'SoundCloud', audio: 166 };
  return null;
}

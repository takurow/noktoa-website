/* Sho Sho サイト設定
   - gallery  : Instagram投稿のURL（横スワイプ。サイズは自動で統一）
   - sessions : NOKTOA sessions の YouTube 動画（id = watch?v= の後ろ）
   - works    : 実績の文字ロゴ表記。url を入れると新しいタブで開くリンクになる（空なら表示のみ）
       公式ロゴが入手できたら logo:'assets/logos/xxx.svg' を足すだけで置き換わる
   - form     : 空なら「メールアプリを開く」方式。Formspree等のURLを入れると、サイトから直接送信される
   出典：@whereisshosho の公開投稿／NOKTOA公式YouTube（2026-10-12 確認） */
const P = id => 'https://www.instagram.com/p/' + id + '/';
const R = id => 'https://www.instagram.com/reel/' + id + '/';
window.SHOSHO = {
  handle: 'whereisshosho',
  email: 'yamaguchisho2@me.com',
  form: '',
  gallery: [
    P('DR487Hnk-Rg'),  // Bvlgari Hotel Tokyo
    P('DWMQZZokaqw'),  // JAPAN BOATSHOW 2026（Azimut 26M Grande / d&b）
    P('DZcolHjzy36'),  // 1 Hotel Tokyo
    P('DaM8GQnxKUV'),  // Celavi Tokyo（SUNDAY BRUNCH）
    P('DasMgebkYkb'),  // Sea Breeze Boat Show（Clase Azul / Azimut）
    R('DdqaKS9vY0F')   // ノンストップMIX
  ],
  sessions: [
    { id: 'BuZnKNdDdj0', title: 'Lounge DJ Mix', sub: 'DJ SHOSHO — NOKTOA Sessions at SeaBreeze Boat Service', len: '66 min' }
  ],
  works: {
    place: [
      { name: 'Bvlgari Hotel Tokyo', mark: 'BVLGARI', sub: 'Hotel Tokyo', k: 'serif', url: 'https://www.bulgarihotels.com/en_US/tokyo' },
      { name: 'Four Seasons Hotel Tokyo', mark: 'FOUR SEASONS', sub: 'Hotel Tokyo', k: 'serif', url: 'https://www.fourseasons.com/tokyo/' },
      { name: 'Grand Hyatt Tokyo', mark: 'GRAND HYATT', sub: 'Tokyo', k: 'wide', url: '' },
      { name: 'JW Marriott Tokyo', mark: 'JW MARRIOTT', sub: 'Tokyo', k: 'serif', url: '' },
      { name: 'Celavi Tokyo', mark: 'CELAVI', sub: 'Tokyo', k: 'wide', url: 'https://www.instagram.com/celavitokyo/' },
      { name: 'Raise Tokyo', mark: 'RAISE', sub: 'Tokyo', k: 'wide', url: '' },
      { name: 'Embassy of Italy in Japan', mark: 'EMBASSY OF ITALY', sub: 'in Japan', k: 'wide', url: 'https://ambtokyo.esteri.it/' },
      { name: 'Tokyo American Club', mark: 'TOKYO AMERICAN CLUB', sub: '', k: 'serif', url: 'https://www.tokyoamericanclub.org/' },
      { name: 'Japan Boat Show', mark: 'JAPAN BOAT SHOW', sub: '', k: 'wide', url: '' }
    ],
    brand: [
      { name: 'Azimut', mark: 'AZIMUT', sub: 'Yachts', k: 'wide', url: 'https://www.azimutyachts.com/' },
      { name: 'd&b audiotechnik', mark: 'd&b', sub: 'audiotechnik', k: 'db', url: 'https://www.dbaudio.com/' },
      { name: 'Clase Azul', mark: 'CLASE AZUL', sub: 'Tequila', k: 'serif', url: 'https://www.claseazul.com/' },
      { name: 'Land Rover', mark: 'LAND ROVER', sub: '', k: 'wide', url: 'https://www.landrover.co.jp/' },
      { name: 'Lardini', mark: 'Lardini', sub: 'Fashion', k: 'italic', url: 'https://www.lardini.it/' }
    ]
  }
};

// ── SHARED CONSTANTS ──────────────────────────────────────────────────────────
// Grid dimensions used by all diagram types
const GRID = 9, QS = 1, QE = 9;
const W = 300, H = 270, PAD = {l:36, r:28, t:22, b:30};

// ── MATH HELPERS ──────────────────────────────────────────────────────────────
function fmt(n) { return Math.round(n * 100) / 100; }

// Supply & Demand price/quantity functions.
// dm  = demand slope multiplier (1=normal, 2=inelastic 2:1, 0.5=elastic 1:2).
// dsc = demand shift coefficient per step (default 2 = legacy SD builder behaviour).
// ssc = supply shift coefficient per step (default 2 = legacy SD builder behaviour).
// Tax builder passes dsc=dm, ssc=1 so every button press moves the curve exactly 1 grid square.
// All variants pass through (5,5) when ds=ss=0.
function dPf(q, ds, dm=1, dsc=2) { return 5*(1+dm) - dm*q + dsc*ds; }
function sPf(q, ss, ssc=2)        { return q - ssc*ss; }
function dQf(p, ds, dm=1, dsc=2) { return (5*(1+dm) - p + dsc*ds) / dm; }
function sQf(p, ss, ssc=2)        { return p + ssc*ss; }
function getEq(ds, ss, dm=1, dsc=2, ssc=2) {
  // demand at price p:  q = (5*(1+dm) - p + dsc*ds) / dm
  // supply at price p:  q = p + ssc*ss
  // equate → p*(1+dm) = 5*(1+dm) + dsc*ds - dm*ssc*ss
  const p = (5*(1+dm) + dsc*ds - dm*ssc*ss) / (1+dm);
  return { p, q: p + ssc*ss };
}

// Convert grid coordinates to SVG pixel coordinates
function gxF(q, pad, W) { return pad.l + q * (W - pad.l - pad.r) / GRID; }
function gyF(p, pad, H) { return pad.t + (GRID - p) * (H - pad.t - pad.b) / GRID; }

// ── SVG HELPERS ───────────────────────────────────────────────────────────────
// Clips a line to the visible grid area using parametric line clipping
function clipLine(qA, pA, qB, pB, pad, W, H, pMin = 0) {
  let t0 = 0, t1 = 1;
  const dq = qB - qA, dp = pB - pA;
  if (dp !== 0) {
    const tL = (pMin - pA) / dp, tH = (GRID - pA) / dp;
    if (dp < 0) { t1 = Math.min(t1, tL); t0 = Math.max(t0, tH); }
    else         { t0 = Math.max(t0, tL); t1 = Math.min(t1, tH); }
  } else if (pA < pMin || pA > GRID) return null;
  if (t0 >= t1) return null;
  return {
    x1: gxF(qA + t0 * dq, pad, W), y1: gyF(pA + t0 * dp, pad, H),
    x2: gxF(qA + t1 * dq, pad, W), y2: gyF(pA + t1 * dp, pad, H)
  };
}

// Appends unit label to Y-axis text if values are in thousands
function getYLbl(id, vU) {
  const b = document.getElementById(id).value || 'Price ($)';
  return vU >= 1000 ? b.replace('($)', '(thousands $)') : b;
}

// ── SVG INNER BUILDER ─────────────────────────────────────────────────────────
// Generates the SVG markup for both S&D and Single Curve diagram types.
// Called by sdDraw() and scDraw() with a config object.
function buildSVGInner(cfg) {
  const { W, H, pad, title, yLbl, xLbl, vU, hU, type, dCol, sCol, col,
          curve, dA, sA, fpA, startDS, startSS, startCS, showFaded, isAnimating,
          showEqLines = true, showEqLabel = true,
          dMult = 1, dShiftCoeff = 2, sShiftCoeff = 2 } = cfg;
  const gx = q => gxF(q, pad, W);
  const gy = p => gyF(p, pad, H);
  const fs = 11, fs2 = 9;
  // When vU/hU >= 1000, axis label shows "(000s)" so display values scaled down
  const vDisp = vU >= 1000 ? vU / 1000 : vU;
  const hDisp = hU >= 1000 ? hU / 1000 : hU;
  const xLblDisp = hU >= 1000 ? xLbl + ' (000s)' : xLbl;

  // Arrow marker definition
  let s = `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;

  // Title
  if (title) s += `<text x="${W/2}" y="13" text-anchor="middle" font-size="${fs}" font-family="Verdana" font-weight="bold" fill="#2c2c2a">${title}</text>`;

  // Horizontal grid lines
  for (let i = 1; i <= GRID; i++)
    s += `<line x1="${pad.l}" y1="${gy(i)}" x2="${W-pad.r}" y2="${gy(i)}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;

  // Vertical grid lines
  for (let i = 1; i <= GRID; i++)
    s += `<line x1="${gx(i)}" y1="${pad.t}" x2="${gx(i)}" y2="${H-pad.b}" stroke="#B4B2A9" stroke-width="0.5" opacity="0.5"/>`;

  // Axes (Y drawn bottom→top so marker-end arrow points upward)
  s += `<line x1="${pad.l}" y1="${H-pad.b+6}" x2="${pad.l}" y2="${pad.t-6}" stroke="#444" stroke-width="1.5" marker-end="url(#arr)" opacity="0.8"/>`;
  s += `<line x1="${pad.l-6}" y1="${H-pad.b}" x2="${W-pad.r+6}" y2="${H-pad.b}" stroke="#444" stroke-width="1.5" marker-end="url(#arr)" opacity="0.8"/>`;

  if (type === 'sd') {
    // ── Supply & Demand ──
    const eq = getEq(dA, sA, dMult, dShiftCoeff, sShiftCoeff);

    // Axis tick labels (hide values that overlap equilibrium point, only when the numeric
    // label is actually being drawn — suppressing when showEqLabel=false leaves a blank gap)
    for (let i = 1; i <= GRID; i++) {
      const eP = showEqLines && showEqLabel && Math.abs(i - eq.p) < 0.05;
      const eQ = showEqLines && showEqLabel && Math.abs(i - eq.q) < 0.05;
      if (!eP) s += `<text x="${pad.l-4}" y="${gy(i)}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(i*vDisp)}</text>`;
      if (!eQ) s += `<text x="${gx(i)}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(i*hDisp)}</text>`;
    }
    s += `<text x="${pad.l-6}" y="${H-pad.b+10}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;
    s += `<text x="${pad.l+(W-pad.l-pad.r)/2}" y="${H-1}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${xLblDisp}</text>`;
    s += `<text x="${fs2}" y="${pad.t+(H-pad.t-pad.b)/2}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888" transform="rotate(-90,${fs2},${pad.t+(H-pad.t-pad.b)/2})">${yLbl}</text>`;

    // Faded D1/S1 curves — always drawn at the origin (position 0) whenever the
    // active curve has shifted away from zero.  This ensures that a pre-shifted
    // starting position (startDS ≠ 0) still shows both D1 and D2 simultaneously.
    const dShifted = dA !== 0, sShifted = sA !== 0;
    if (showFaded) {
      if (dShifted) {
        const cd = clipLine(QS, dPf(QS, 0, dMult, dShiftCoeff), QE, dPf(QE, 0, dMult, dShiftCoeff), pad, W, H, 1);
        if (cd) s += `<line x1="${cd.x1}" y1="${cd.y1}" x2="${cd.x2}" y2="${cd.y2}" stroke="${dCol}" stroke-width="2" stroke-linecap="round" opacity="1"/><text x="${cd.x2+4}" y="${cd.y2}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${dCol}" opacity="1" font-weight="bold">D1</text>`;
      }
      if (sShifted) {
        const cs = clipLine(QS, sPf(QS, 0, sShiftCoeff), QE, sPf(QE, 0, sShiftCoeff), pad, W, H);
        if (cs) s += `<line x1="${cs.x1}" y1="${cs.y1}" x2="${cs.x2}" y2="${cs.y2}" stroke="${sCol}" stroke-width="2" stroke-linecap="round" opacity="1"/><text x="${cs.x2+4}" y="${Math.min(cs.y1,cs.y2)}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${sCol}" opacity="1" font-weight="bold">S1</text>`;
      }
    }

    // Active curves — labelled by absolute position (D1 at origin, D2 shifted)
    const dl = dA === 0 ? 'D1' : 'D2', sl = sA === 0 ? 'S1' : 'S2';
    const cd = clipLine(QS, dPf(QS, dA, dMult, dShiftCoeff), QE, dPf(QE, dA, dMult, dShiftCoeff), pad, W, H, 1);
    const cs = clipLine(QS, sPf(QS, sA, sShiftCoeff), QE, sPf(QE, sA, sShiftCoeff), pad, W, H);
    if (cd) s += `<line x1="${cd.x1}" y1="${cd.y1}" x2="${cd.x2}" y2="${cd.y2}" stroke="${dCol}" stroke-width="2.5" stroke-linecap="round"/><text x="${cd.x2+4}" y="${cd.y2}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${dCol}" font-weight="bold">${dl}</text>`;
    if (cs) s += `<line x1="${cs.x1}" y1="${cs.y1}" x2="${cs.x2}" y2="${cs.y2}" stroke="${sCol}" stroke-width="2.5" stroke-linecap="round"/><text x="${cs.x2+4}" y="${Math.min(cs.y1,cs.y2)}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${sCol}" font-weight="bold">${sl}</text>`;

    // Equilibrium dot + dashed lines
    if (eq.q >= QS && eq.q <= QE && eq.p >= 1 && eq.p <= GRID) {
      const ex = gx(eq.q), ey = gy(eq.p);
      if (showEqLines) {
        s += `<line x1="${pad.l}" y1="${ey}" x2="${ex}" y2="${ey}" stroke="#888" stroke-width="1" stroke-dasharray="5,4"/>`;
        s += `<line x1="${ex}" y1="${H-pad.b}" x2="${ex}" y2="${ey}" stroke="#888" stroke-width="1" stroke-dasharray="5,4"/>`;
        s += `<circle cx="${ex}" cy="${ey}" r="6" fill="#D85A30" stroke="white" stroke-width="2"/>`;
        if (!isAnimating && showEqLabel) {
          s += `<text x="${pad.l-4}" y="${ey}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#D85A30" font-weight="bold">${fmt(eq.p*vDisp)}</text>`;
          s += `<text x="${ex}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#D85A30" font-weight="bold">${fmt(eq.q*hDisp)}</text>`;
        }
      }
    }

  } else {
    // ── Single Curve ──
    const fp = fpA;
    const qInt = curve === 'demand' ? dQf(fp, dA) : sQf(fp, sA);

    // Axis tick labels (hide values that overlap intersection point, only when eq marker is visible)
    for (let i = 1; i <= GRID; i++) {
      const isFP = showEqLines && Math.abs(i - fp) < 0.05;
      const isIQ = showEqLines && Math.abs(i - qInt) < 0.05;
      if (!isFP) s += `<text x="${pad.l-4}" y="${gy(i)}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(i*vDisp)}</text>`;
      if (!isIQ) s += `<text x="${gx(i)}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${fmt(i*hDisp)}</text>`;
    }
    s += `<text x="${pad.l-6}" y="${H-pad.b+10}" text-anchor="end" font-size="${fs2}" font-family="Verdana" fill="#888">0</text>`;
    s += `<text x="${pad.l+(W-pad.l-pad.r)/2}" y="${H-1}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888">${xLblDisp}</text>`;
    s += `<text x="${fs2}" y="${pad.t+(H-pad.t-pad.b)/2}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#888" transform="rotate(-90,${fs2},${pad.t+(H-pad.t-pad.b)/2})">${yLbl}</text>`;

    // Faded D1/S1 curve — always at the origin (0) whenever the active curve
    // has shifted, so a pre-shifted starting state still shows both curves.
    const curShift = curve === 'demand' ? dA : sA;
    if (curShift !== 0 && showFaded) {
      const c1 = curve === 'demand'
        ? clipLine(QS, dPf(QS, 0), QE, dPf(QE, 0), pad, W, H, 1)
        : clipLine(QS, sPf(QS, 0), QE, sPf(QE, 0), pad, W, H);
      if (c1) {
        const ly = curve === 'demand' ? c1.y2 : Math.min(c1.y1, c1.y2);
        const fadedLbl = curve === 'demand' ? 'D1' : 'S1';
        s += `<line x1="${c1.x1}" y1="${c1.y1}" x2="${c1.x2}" y2="${c1.y2}" stroke="${col}" stroke-width="2" stroke-linecap="round" opacity="1"/><text x="${c1.x2+4}" y="${ly}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${col}" opacity="1" font-weight="bold">${fadedLbl}</text>`;
      }
    }

    // Active curve — labelled by absolute position
    const shifted = curShift !== 0;
    const lbl = shifted ? (curve === 'demand' ? 'D2' : 'S2') : (curve === 'demand' ? 'D1' : 'S1');
    const c = curve === 'demand'
      ? clipLine(QS, dPf(QS, dA), QE, dPf(QE, dA), pad, W, H, 1)
      : clipLine(QS, sPf(QS, sA), QE, sPf(QE, sA), pad, W, H);
    if (c) {
      const ly = curve === 'demand' ? c.y2 : Math.min(c.y1, c.y2);
      s += `<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/><text x="${c.x2+4}" y="${ly}" dominant-baseline="central" font-size="${fs}" font-family="Verdana" fill="${col}" font-weight="bold">${lbl}</text>`;
    }

    // Intersection dot + dashed lines
    if (qInt >= QS && qInt <= QE) {
      const ix = gx(qInt), py = gy(fp);
      if (showEqLines) {
        s += `<line x1="${pad.l}" y1="${py}" x2="${ix}" y2="${py}" stroke="#D85A30" stroke-width="1.5" stroke-dasharray="6,4"/>`;
        s += `<line x1="${ix}" y1="${py}" x2="${ix}" y2="${H-pad.b}" stroke="#D85A30" stroke-width="1" stroke-dasharray="4,3"/>`;
        s += `<circle cx="${ix}" cy="${py}" r="5" fill="#D85A30" stroke="white" stroke-width="2"/>`;
        if (!isAnimating) {
          s += `<text x="${pad.l-4}" y="${py}" text-anchor="end" dominant-baseline="central" font-size="${fs2}" font-family="Verdana" fill="#D85A30" font-weight="bold">${fmt(fp*vDisp)}</text>`;
          s += `<text x="${ix}" y="${H-pad.b+11}" text-anchor="middle" font-size="${fs2}" font-family="Verdana" fill="#D85A30" font-weight="bold">${fmt(qInt*hDisp)}</text>`;
        }
      }
    }
  }

  return s;
}

// ── PRICE ELASTICITY OF DEMAND (PED) RENDERER ─────────────────────────────────
// Self-contained, illustrative PED graph. Written with plain string concatenation
// (no template literals) so the IDENTICAL source can be embedded inside the
// exported quiz template in quiz-export.js without escaping.
// q fields: title, yLbl, xLbl, startPrice, pricePct, ped, perfectElastic
function pedInner(q){
  var W=400,H=340,L=56,R=372,T=30,B=286;
  var cx=(L+R)/2, yP1=232, yP2=92, GMAX=120;
  var esc=function(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
  var f=function(n){return Math.round(n*100)/100;};
  var P1=(isFinite(q.startPrice)&&q.startPrice>0)?q.startPrice:10;
  var pct=(isFinite(q.pricePct)&&q.pricePct!==0)?q.pricePct:0.20;
  var P2=Math.round(P1*(1+pct)*100)/100;
  var Q1=100;
  var title=q.title||'', yLbl=q.yLbl||'Price ($)', xLbl=q.xLbl||'Quantity';
  var fs=12, fs2=10;
  var s='';
  if(title) s+='<text x="'+(W/2)+'" y="16" text-anchor="middle" font-size="'+fs+'" font-family="Verdana" font-weight="bold" fill="#2c2c2a">'+esc(title)+'</text>';
  // axes
  s+='<line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+B+'" stroke="#444" stroke-width="1.5"/>';
  s+='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="#444" stroke-width="1.5"/>';
  // axis titles
  s+='<text x="'+(L-42)+'" y="'+((T+B)/2)+'" font-size="'+fs2+'" font-family="Verdana" fill="#888" text-anchor="middle" transform="rotate(-90 '+(L-42)+' '+((T+B)/2)+')">'+esc(yLbl)+'</text>';
  s+='<text x="'+((L+R)/2)+'" y="'+(B+26)+'" font-size="'+fs2+'" font-family="Verdana" fill="#888" text-anchor="middle">'+esc(xLbl)+'</text>';

  var color=q.color||(q.perfectElastic?'#0d9488':(q.ped===0?'#6b21a8':(q.ped<1?'#185FA5':(q.ped===1?'#15803d':'#EC3C78'))));

  if(q.perfectElastic){
    var yMid=Math.round((yP1+yP2)/2);
    s+='<line x1="'+L+'" y1="'+yMid+'" x2="'+(R-8)+'" y2="'+yMid+'" stroke="#dfe4ee" stroke-width="1" stroke-dasharray="4 3"/>';
    s+='<text x="'+(L-6)+'" y="'+(yMid+4)+'" font-size="'+fs2+'" font-family="Verdana" fill="#555" text-anchor="end">$'+f(P1)+'</text>';
    s+='<line x1="'+(L+18)+'" y1="'+yMid+'" x2="'+(R-24)+'" y2="'+yMid+'" stroke="'+color+'" stroke-width="3"/>';
    s+='<text x="'+(R-22)+'" y="'+(yMid-9)+'" font-size="'+fs+'" font-family="Verdana" font-weight="bold" fill="'+color+'" text-anchor="end">D</text>';
    return s;
  }

  var ped=(isFinite(q.ped)&&q.ped>=0)?q.ped:0.5;
  var g=(Math.min(ped,2)/2)*GMAX;
  var Q2=Math.round(Q1*(1-ped*pct)*100)/100;
  // Points A (start) and B (after change). Higher price sits top-left (lower quantity),
  // lower price bottom-right (higher quantity) — a downward-sloping demand line whether
  // the price rises or falls.
  var A={p:P1,qy:Q1,nm:'A'}, Bp={p:P2,qy:Q2,nm:'B'};
  var hi=(A.p>=Bp.p)?A:Bp, lo=(A.p>=Bp.p)?Bp:A;
  var hiX=cx-g, hiY=yP2, loX=cx+g, loY=yP1;   // yP2 top (high price), yP1 bottom (low price)
  // price guide lines: top = higher price, bottom = lower price
  var glines=[[yP1,'$'+f(lo.p)],[yP2,'$'+f(hi.p)]];
  for(var i=0;i<glines.length;i++){
    s+='<line x1="'+L+'" y1="'+glines[i][0]+'" x2="'+(R-8)+'" y2="'+glines[i][0]+'" stroke="#dfe4ee" stroke-width="1" stroke-dasharray="4 3"/>';
    s+='<text x="'+(L-6)+'" y="'+(glines[i][0]+4)+'" font-size="'+fs2+'" font-family="Verdana" fill="#555" text-anchor="end">'+glines[i][1]+'</text>';
  }
  // demand line through both points, extended past each end
  var dx=loX-hiX, dy=loY-hiY, len=Math.sqrt(dx*dx+dy*dy)||1; dx/=len; dy/=len; var ext=36;
  s+='<line x1="'+(hiX-dx*ext)+'" y1="'+(hiY-dy*ext)+'" x2="'+(loX+dx*ext)+'" y2="'+(loY+dy*ext)+'" stroke="'+color+'" stroke-width="3"/>';
  s+='<text x="'+(loX+dx*ext+3)+'" y="'+(loY+dy*ext+14)+'" font-size="'+fs+'" font-family="Verdana" font-weight="bold" fill="'+color+'">D</text>';
  // points: lo bottom-right, hi top-left
  var pts=[[loX,loY,lo.nm,lo.qy,'start'],[hiX,hiY,hi.nm,hi.qy,'end']];
  for(var j=0;j<pts.length;j++){
    var px=pts[j][0], py=pts[j][1], nm=pts[j][2], qv=pts[j][3], anch=pts[j][4];
    s+='<line x1="'+px+'" y1="'+py+'" x2="'+px+'" y2="'+B+'" stroke="#b6bfce" stroke-width="1" stroke-dasharray="4 3"/>';
    s+='<text x="'+(px+(anch==='start'?3:-3))+'" y="'+(B+13)+'" font-size="'+fs2+'" font-family="Verdana" fill="#555" text-anchor="'+anch+'">'+f(qv)+'</text>';
    s+='<circle cx="'+px+'" cy="'+py+'" r="5" fill="#fff" stroke="'+color+'" stroke-width="2.5"/>';
    var lx=(anch==='start')?px+9:px-9;
    s+='<text x="'+lx+'" y="'+(py-8)+'" font-size="'+fs+'" font-family="Verdana" font-weight="bold" fill="#0A0C56" text-anchor="'+(anch==='start'?'start':'end')+'">'+nm+'</text>';
  }
  return s;
}

// ── CONSUMER / PRODUCER SURPLUS & DEADWEIGHT LOSS RENDERER ────────────────────
// Plain concatenation (no template literals) so the identical source can be
// embedded inside quiz-export.js. Fixed model: demand P=100-Q, supply P=Q, eq(50,50).
// q fields: title, yLbl, xLbl, dCol, sCol, mode ('eq'|'qty'|'tax'|'price'), param,
//           showLetters (bool), reveals (ordered array of 'CS','PS','DWL','TAX').
// nRev = how many of q.reveals to shade (for stepped reveal). Defaults to all.
function surCentroid(pts){var x=0,y=0;for(var i=0;i<pts.length;i++){x+=pts[i][0];y+=pts[i][1];}return [x/pts.length,y/pts.length];}
function surRegions(mode,Qt,Pc,Ps){
  var Dm=100,Pst=50,Qe=50;
  var dm=function(Q){return Dm-Q;}, sp=function(Q){return Q;};
  if(mode==='eq') return [ [[0,Dm],[0,Pst],[Qe,Pst]], [[0,Pst],[Qe,Pst],[0,0]] ];
  if(mode==='tax') return [
    [[0,Dm],[0,Pc],[Qt,Pc]], [[0,Pc],[Qt,Pc],[Qt,Pst],[0,Pst]], [[0,Pst],[Qt,Pst],[Qt,Ps],[0,Ps]],
    [[Qt,Pc],[Qe,Pst],[Qt,Pst]], [[Qt,Pst],[Qe,Pst],[Qt,Ps]], [[0,Ps],[Qt,Ps],[0,0]] ];
  if(Pc>Pst) return [ // restricted quantity or price floor (producers capture)
    [[0,Dm],[0,Pc],[Qt,Pc]], [[0,Pc],[Qt,Pc],[Qt,Pst],[0,Pst]], [[0,Pst],[Qt,Pst],[Qt,sp(Qt)],[0,0]],
    [[Qt,Pc],[Qe,Pst],[Qt,Pst]], [[Qt,Pst],[Qe,Pst],[Qt,sp(Qt)]] ];
  return [ // price ceiling (consumers capture)
    [[0,Dm],[0,Pst],[Qt,Pst],[Qt,dm(Qt)]], [[0,Pst],[Qt,Pst],[Qt,Pc],[0,Pc]], [[0,Pc],[Qt,Pc],[0,0]],
    [[Qt,dm(Qt)],[Qe,Pst],[Qt,Pst]], [[Qt,Pst],[Qe,Pst],[Qt,Pc]] ];
}
function surInner(q,nRev){
  var W=400,H=340,L=52,R=372,T=28,B=292,QMAX=100,PMAX=100;
  var X=function(Q){return L+(Q/QMAX)*(R-L);}, Y=function(P){return B-(P/PMAX)*(B-T);};
  var esc=function(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
  var Dmax=100,Qeq=50,Peq=50, dem=function(Q){return Dmax-Q;}, sup=function(Q){return Q;};
  var mode=q.mode||'eq', param=(q.param==null?20:q.param);
  var dCol=q.dCol||'#185FA5', sCol=q.sCol||'#0F6E56';
  var reveals=q.reveals||[], showLetters=!!q.showLetters;
  if(nRev==null) nRev=reveals.length;
  var fs=12, fs2=10;
  // Price/Qty units scale the DISPLAYED axis numbers (same system as other builders).
  // Base grid position 5 = internal 50; displayed value = (internal/10) * unit.
  var vU=(q.vUnit==null?50:q.vUnit), hU=(q.hUnit==null?50:q.hUnit); // actual equilibrium price / quantity
  var fmtn=function(n){return Math.round(n*100)/100;};
  var pdisp=function(P){return fmtn(P*vU/50);}, qdisp=function(Q){return fmtn(Q*hU/50);};
  // compute traded quantity + prices
  var Qt,Pc,Ps,kind='';
  if(mode==='eq'){Qt=Qeq;Pc=Peq;Ps=Peq;}
  else if(mode==='qty'){Qt=param;Pc=dem(Qt);Ps=Pc;kind='Restricted quantity';}
  else if(mode==='tax'){Qt=(Dmax-param)/2;Pc=dem(Qt);Ps=sup(Qt);kind='Tax';}
  else if(mode==='price'){ if(param>=Peq){Qt=Dmax-param;Pc=param;Ps=param;kind='Price floor';} else {Qt=param;Pc=param;Ps=param;kind='Price ceiling';} }
  var poly=function(pts){return pts.map(function(p){return X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1);}).join(' ');};
  var s='';
  if(q.title) s+='<text x="'+(W/2)+'" y="15" text-anchor="middle" font-size="'+fs+'" font-family="Verdana" font-weight="bold" fill="#2c2c2a">'+esc(q.title)+'</text>';
  // shaded areas (first nRev of the reveal list)
  s+='<defs><pattern id="surhcs" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="rgba(24,95,165,0.13)"/><line x1="0" y1="0" x2="0" y2="7" stroke="#185FA5" stroke-width="2.2"/></pattern><pattern id="surhps" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="rgba(15,110,86,0.13)"/><line x1="0" y1="0" x2="0" y2="7" stroke="#0F6E56" stroke-width="2.2"/></pattern></defs>';
  var elem=surRegions(mode,Qt,Pc,Ps);
  var areaPoly={ CS:[[0,Pc],[0,Dmax],[Qt,dem(Qt)],[Qt,Pc]], PS:[[0,Ps],[0,0],[Qt,sup(Qt)],[Qt,Ps]], DWL:[[Qt,dem(Qt)],[Qt,sup(Qt)],[Qeq,Peq]], TAX:[[0,Pc],[Qt,Pc],[Qt,Ps],[0,Ps]] };
  var areaFill={CS:'rgba(24,95,165,.32)',PS:'rgba(15,110,86,.32)',DWL:'rgba(216,45,45,.4)',TAX:'rgba(196,125,0,.34)'};
  var lossIdx=function(key){ if(mode==='tax') return key==='LOSSCS'?[1,3]:(key==='LOSSPS'?[2,4]:[]); if(mode==='qty') return key==='LOSSCS'?[1,3]:[]; if(mode==='price') return (kind==='Price floor')?(key==='LOSSCS'?[1,3]:[]):(key==='LOSSPS'?[1,4]:[]); return []; };
  var lossFill={LOSSCS:'url(#surhcs)',LOSSPS:'url(#surhps)'};
  var effReveals=[];
  for(var ei=0;ei<reveals.length;ei++){ var kk=reveals[ei]; if(kk==='DWL' && !(Qt<Qeq)) continue; if(kk==='TAX' && mode!=='tax') continue; if((kk==='LOSSCS'||kk==='LOSSPS') && lossIdx(kk).length===0) continue; effReveals.push(kk); }
  for(var r=0;r<Math.min(nRev,effReveals.length);r++){ var key=effReveals[r]; if(areaPoly[key]){ s+='<polygon class="sur-fade" points="'+poly(areaPoly[key])+'" fill="'+areaFill[key]+'"/>'; } else if(lossFill[key]){ var li=lossIdx(key); for(var mi=0;mi<li.length;mi++){ s+='<polygon class="sur-fade" points="'+poly(elem[li[mi]])+'" fill="'+lossFill[key]+'" stroke="'+(key==='LOSSCS'?'#185FA5':'#0F6E56')+'" stroke-width="1.2" stroke-opacity="0.7"/>'; } } }
  // axes + labels
  s+='<line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+B+'" stroke="#444" stroke-width="1.5"/>';
  s+='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="#444" stroke-width="1.5"/>';
  s+='<text x="'+(L-38)+'" y="'+((T+B)/2)+'" font-size="'+fs2+'" font-family="Verdana" fill="#555" text-anchor="middle" transform="rotate(-90 '+(L-38)+' '+((T+B)/2)+')">'+esc(q.yLbl||'Price ($)')+'</text>';
  s+='<text x="'+((L+R)/2)+'" y="'+(B+30)+'" font-size="'+fs2+'" font-family="Verdana" fill="#555" text-anchor="middle">'+esc(q.xLbl||'Quantity')+'</text>';
  // curves (touch axes)
  s+='<line x1="'+X(0)+'" y1="'+Y(Dmax)+'" x2="'+X(Dmax)+'" y2="'+Y(0)+'" stroke="'+dCol+'" stroke-width="2.5"/>';
  s+='<text x="'+(X(Dmax)+6)+'" y="'+(Y(0)-3)+'" font-size="'+fs2+'" font-family="Verdana" font-weight="700" fill="'+dCol+'" stroke="#fff" stroke-width="2.5" paint-order="stroke" text-anchor="start">D</text>';
  s+='<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(PMAX)+'" y2="'+Y(PMAX)+'" stroke="'+sCol+'" stroke-width="2.5"/>';
  s+='<text x="'+(X(PMAX)+6)+'" y="'+(Y(PMAX)+11)+'" font-size="'+fs2+'" font-family="Verdana" font-weight="700" fill="'+sCol+'" stroke="#fff" stroke-width="2.5" paint-order="stroke" text-anchor="start">S</text>';
  // S + tax line
  if(mode==='tax'){ var tt=param; s+='<line x1="'+X(0)+'" y1="'+Y(tt)+'" x2="'+X(100-tt)+'" y2="'+Y(100)+'" stroke="'+sCol+'" stroke-width="1.8" stroke-dasharray="6 4" opacity="0.85"/>'; s+='<text x="'+(X(100-tt)+2)+'" y="'+(Y(100)+10)+'" font-size="9" font-family="Verdana" font-weight="700" fill="'+sCol+'">S+tax</text>'; }
  // traded-quantity guide (distorted)
  if(mode!=='eq'){ s+='<line x1="'+X(Qt)+'" y1="'+B+'" x2="'+X(Qt)+'" y2="'+Y(Math.max(dem(Qt),Pc,Ps))+'" stroke="#888" stroke-width="1" stroke-dasharray="5 3"/>'; s+='<text x="'+X(Qt)+'" y="'+(B+12)+'" font-size="9" font-family="Verdana" fill="#555" text-anchor="middle">'+qdisp(Qt)+'</text>'; }
  // price markers
  var pmark=function(P,label,col){ s+='<line x1="'+L+'" y1="'+Y(P)+'" x2="'+X(Qt)+'" y2="'+Y(P)+'" stroke="'+col+'" stroke-width="1" stroke-dasharray="5 3"/>'; s+='<circle cx="'+X(Qt)+'" cy="'+Y(P)+'" r="4" fill="#fff" stroke="'+col+'" stroke-width="2"/>'; s+='<text x="'+(L-5)+'" y="'+(Y(P)+3.5)+'" font-size="9" font-family="Verdana" font-weight="700" fill="'+col+'" text-anchor="end">'+label+'</text>'; };
  if(mode==='tax'){ pmark(Pc,'Pc '+pdisp(Pc),dCol); pmark(Ps,'Ps '+pdisp(Ps),sCol); }
  else if(mode==='qty'){ pmark(Pc,'P '+pdisp(Pc),'#b23a00'); }
  else if(mode==='price'){ pmark(Pc,(kind==='Price floor'?'Pf ':'Pc ')+pdisp(Pc),'#b23a00'); }
  // equilibrium reference (always)
  s+='<line x1="'+L+'" y1="'+Y(Peq)+'" x2="'+X(Qeq)+'" y2="'+Y(Peq)+'" stroke="#0A0C56" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>';
  s+='<line x1="'+X(Qeq)+'" y1="'+B+'" x2="'+X(Qeq)+'" y2="'+Y(Peq)+'" stroke="#0A0C56" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>';
  s+='<circle cx="'+X(Qeq)+'" cy="'+Y(Peq)+'" r="4" fill="#fff" stroke="#0A0C56" stroke-width="2"/>';
  s+='<text x="'+(X(Qeq)+7)+'" y="'+(Y(Peq)-7)+'" font-size="9" font-family="Verdana" font-weight="700" fill="#0A0C56" stroke="#fff" stroke-width="2.5" paint-order="stroke">E</text>';
  s+='<text x="'+(L-5)+'" y="'+(Y(Peq)+3.5)+'" font-size="9" font-family="Verdana" font-weight="700" fill="#0A0C56" text-anchor="end">'+(mode==='eq'?'Pe ':'P* ')+pdisp(Peq)+'</text>';
  s+='<text x="'+X(Qeq)+'" y="'+(B+12)+'" font-size="9" font-family="Verdana" font-weight="700" fill="#0A0C56" text-anchor="middle">'+qdisp(Qeq)+'</text>';
  // elemental area letters
  if(showLetters){ var regs=surRegions(mode,Qt,Pc,Ps); for(var i=0;i<regs.length;i++){ var ct=surCentroid(regs[i]); var cxp=X(ct[0]),cyp=Y(ct[1]); s+='<circle cx="'+cxp+'" cy="'+cyp+'" r="8" fill="#fff" stroke="#0A0C56" stroke-width="1"/>'; s+='<text x="'+cxp+'" y="'+(cyp+3)+'" font-size="10" font-family="Verdana" font-weight="700" fill="#0A0C56" text-anchor="middle">'+String.fromCharCode(65+i)+'</text>'; } }
  return s;
}

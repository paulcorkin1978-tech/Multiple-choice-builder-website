/* Daily bank — Year 11. One object per question.
   topics: one or more topic ids (see taxonomy.js). A question may list topics from several courses.
   src: where it came from (e.g. the photo T1W3D2). figure: optional HTML/SVG shown above options.
   correct: 0-based index of the right option. */
window.T2E = window.T2E || {};
(T2E.bank = T2E.bank || []).push(
{ id:'y11-0018', src:'T1W3D2', topics:['y11.markets.equilibrium'],
  stem:'The graph shows the demand and supply for smartphones. Which combination of demand and supply changes would result in a new equilibrium at point X?',
  figure:'<div class="figbox"><svg width="380" height="300" viewBox="0 0 380 300" xmlns="http://www.w3.org/2000/svg" font-family="Nunito,sans-serif"><text x="70" y="34" fill="#2d2a4a" font-size="15" font-weight="800">Price</text><line x1="80" y1="44" x2="80" y2="262" stroke="#2d2a4a" stroke-width="3"/><line x1="80" y1="262" x2="352" y2="262" stroke="#2d2a4a" stroke-width="3"/><text x="290" y="286" fill="#2d2a4a" font-size="15" font-weight="800">Quantity</text><line x1="108" y1="70" x2="300" y2="240" stroke="#e8447a" stroke-width="3.5" stroke-linecap="round"/><text x="96" y="66" fill="#e8447a" font-size="18" font-weight="900">D</text><line x1="108" y1="240" x2="300" y2="70" stroke="#00a98a" stroke-width="3.5" stroke-linecap="round"/><text x="306" y="70" fill="#00a98a" font-size="18" font-weight="900">S</text><circle cx="322" cy="168" r="5.5" fill="#2d2a4a"/><text x="330" y="162" fill="#2d2a4a" font-size="17" font-weight="900">X</text></svg></div>',
  options:['More smartphone advertising and a rise in the price of a substitute','An increase in incomes and a decrease in the cost of smartphone components','Greater expectations that the price of smartphones will fall, and an increase in smartphone production technology','A reduced population and adverse weather affecting the manufacture of smartphones'],
  correct:1,
  explanation:'Point X sits to the <i>right</i> of the original equilibrium at a similar price — quantity has risen while price is little changed. That needs <b>both</b> demand and supply to increase. B does exactly this: higher incomes lift demand for this normal good, and cheaper components increase supply, so quantity rises with the price effects offsetting. (A pushes price up; C and D pull quantity the wrong way.)' },

{ id:'y11-0005', src:'T1W4D1', topics:['y11.markets.ped'],
  stem:'A firm changed its pricing on three goods (i, ii and iii). The table shows the changes and the outcomes. Which conclusion can be made?',
  figure:'<table class="quiz-tbl"><thead><tr><th>GOOD</th><th>PRICE</th><th>TOTAL REVENUE</th></tr></thead><tbody><tr><td>i</td><td>Increase</td><td>Decrease</td></tr><tr><td>ii</td><td>Decrease</td><td>Decrease</td></tr><tr><td>iii</td><td>No change</td><td>No change</td></tr></tbody></table>',
  options:['Goods ii and iii are substitutes','The price elasticity of demand for good iii is perfectly inelastic','The price elasticity of demand for good i exceeds that of good ii','The price elasticity of demand for good ii is unitary'],
  correct:2,
  explanation:'Good i: a price <i>rise</i> cut total revenue → demand is <b>elastic</b> (PED &gt; 1). Good ii: a price <i>fall</i> also cut total revenue → demand is <b>inelastic</b> (PED &lt; 1). So good i is more elastic than good ii — <b>C</b>. The price of good iii did not change, so nothing can be said about its elasticity.' },

/* ---- SAMPLES written to test the picker — review before students see them ---- */
{ id:'y11-s001', sample:true, topics:['y11.markets.demand'],
  stem:'Household incomes fall. What is the most likely effect in the market for a normal good?',
  options:['A contraction in quantity demanded','A leftward shift of the demand curve','A rightward shift of the supply curve','An expansion in quantity supplied'],
  correct:1,
  explanation:'Income is a <b>non-price determinant</b> of demand. For a normal good, lower income reduces demand at every price — the whole curve shifts left. A contraction is a movement along the curve caused by a change in the good’s <i>own</i> price.' },
{ id:'y11-s002', sample:true, topics:['y11.markets.pes'],
  stem:'Why is the supply of fresh strawberries likely to be more price inelastic in the short run than in the long run?',
  options:['Strawberries are a luxury good','Producers need time to plant and grow additional crops','Consumers can easily switch to substitutes','Strawberries have a high income elasticity of demand'],
  correct:1,
  explanation:'Elasticity of <i>supply</i> depends on how readily producers can raise output. Crops take time to plant and mature, so in the short run output cannot respond quickly to a price rise; over a longer period it can. B–D describe demand-side factors.' },
{ id:'y11-s003', sample:true, topics:['y11.intro.ppf'],
  stem:'On a production possibilities frontier, a point inside the curve indicates that the economy',
  options:['is producing at maximum productive efficiency','has resources that are unemployed or underused','has achieved a higher level of technology','is producing a combination that is unattainable'],
  correct:1,
  explanation:'Points <b>on</b> the PPF use all resources efficiently; points <b>inside</b> mean resources are idle or inefficiently used; points <b>outside</b> are unattainable with current resources and technology.' },
{ id:'y11-s004', sample:true, topics:['y11.intl.exchange-rates'],
  stem:'All else equal, an appreciation of the Australian dollar will',
  options:['make Australian exports cheaper for foreign buyers','make imports more expensive in Australian dollars','make Australian exports more expensive for foreign buyers','increase the cost of overseas holidays for Australians'],
  correct:2,
  explanation:'A higher AUD means foreign buyers need more of their own currency to buy the same Australian goods, so exports become more expensive to them. Imports become <i>cheaper</i> in AUD, and overseas travel cheaper for Australians.' }
);

/* Theory2Econ daily bank — course/topic taxonomy.
   Topic id = <course>.<area>.<sub>   e.g. y11.markets.ped
   To add a course version (e.g. a new Year 12), add an object to T2E.courses.
   Questions point at topic ids (see bank-*.js), so a question can sit in several courses at once. */
window.T2E = window.T2E || {};
T2E.courses = [
 { id:'y11', label:'Year 11 · new syllabus (2025)', source:'NESA Economics 11–12 (2025)',
   areas:[
  { id:'intro', label:'Introduction to economics', subs:[
    {id:'thinking', label:'Economic thinking'},
    {id:'operation', label:'Operation of an economy'},
    {id:'ppf', label:'Model: production possibilities'},
    {id:'circular', label:'Model: circular flow of income'},
    {id:'cycle', label:'Model: business cycle'}]},
  { id:'markets', label:'Markets', subs:[
    {id:'role', label:'Role of markets'},
    {id:'demand', label:'Demand'},
    {id:'supply', label:'Supply'},
    {id:'equilibrium', label:'Market equilibrium'},
    {id:'ped', label:'Price elasticity of demand'},
    {id:'pes', label:'Price elasticity of supply'},
    {id:'structures', label:'Market structures and competition for sellers'},
    {id:'failure', label:'Nature and types of market failure'},
    {id:'intervention', label:'Government intervention in market failures'}]},
  { id:'hbs', label:'Household and business sector', subs:[
    {id:'hh-consumption', label:'Households: consumption of goods and services'},
    {id:'hh-labour', label:'Households: provision of labour'},
    {id:'bus-production', label:'Businesses: production of goods and services'},
    {id:'bus-income', label:'Businesses: provision of income'}]},
  { id:'fin', label:'Financial sector', subs:[
    {id:'role', label:'Role of the financial sector'},
    {id:'equity', label:'Financial markets: equity'},
    {id:'debt', label:'Financial markets: debt'}]},
  { id:'gov', label:'Government sector', subs:[
    {id:'role', label:'Role of government'},
    {id:'tax', label:'Taxation'},
    {id:'spending', label:'Government spending'}]},
  { id:'intl', label:'International sector', subs:[
    {id:'trade', label:'International trade'},
    {id:'investment', label:'International investment'},
    {id:'exchange-rates', label:'Exchange rates'},
    {id:'bop', label:'Balance of payments'}]}
 ]},

 { id:'y12n', label:'Year 12 · new syllabus (from 2027)', source:'NESA Economics 11–12 (2025)',
   areas:[
  { id:'issues', label:'Economic issues in the Australian economy', subs:[
    {id:'growth', label:'Economic growth'},
    {id:'employment', label:'Employment and unemployment'},
    {id:'inflation', label:'Inflation'},
    {id:'inequality', label:'Inequality'},
    {id:'sustainability', label:'Environmental sustainability'}]},
  { id:'mgmt', label:'Economic management of the Australian economy', subs:[
    {id:'objectives', label:'Economic objectives'},
    {id:'fiscal', label:'Fiscal policy'},
    {id:'monetary', label:'Monetary policy'},
    {id:'micro', label:'Microeconomic policy'},
    {id:'labour', label:'Labour market policy'},
    {id:'environmental', label:'Environmental policy'},
    {id:'mix', label:'Policy mix'}]},
  { id:'global', label:'Australia and the global economy', subs:[
    {id:'trade', label:'Global trade'},
    {id:'investment', label:'Global investment'},
    {id:'fx', label:'Exchange rates'},
    {id:'development', label:'International economic development'},
    {id:'impacts', label:'Impacts of the global economy on Australia'}]}
 ]},

 /* SCAFFOLD — current (2026) Year 12 course, from memory of the 2019 syllabus structure.
    Check topic/sub-topic names against your own copy before relying on them. */
 { id:'y12l', label:'Year 12 · current course (to 2026)', source:'NESA Economics Stage 6 (2019) — verify', verify:true,
   areas:[
  { id:'t1', label:'Topic 1: The global economy', subs:[
    {id:'intro', label:'Introduction to the global economy'},
    {id:'trade', label:'Trade and trade liberalisation'},
    {id:'protection', label:'Protection'},
    {id:'financial-flows', label:'Financial flows and exchange rates'},
    {id:'institutions', label:'International institutions (IMF, World Bank, WTO)'},
    {id:'development', label:'Economic development'},
    {id:'bop', label:'Balance of payments'}]},
  { id:'t2', label:"Topic 2: Australia's place in the global economy", subs:[
    {id:'flows', label:"Australia's trade and financial flows"},
    {id:'fx', label:'Exchange rates'},
    {id:'bop', label:'Balance of payments and foreign debt'},
    {id:'protection', label:'Protection and trade liberalisation'}]},
  { id:'t3', label:'Topic 3: Economic issues', subs:[
    {id:'growth', label:'Economic growth'},
    {id:'unemployment', label:'Unemployment'},
    {id:'inflation', label:'Inflation'},
    {id:'distribution', label:'Distribution of income and wealth'},
    {id:'environment', label:'Environmental sustainability'}]},
  { id:'t4', label:'Topic 4: Economic policies and management', subs:[
    {id:'objectives', label:'Economic objectives'},
    {id:'fiscal', label:'Fiscal policy'},
    {id:'monetary', label:'Monetary policy'},
    {id:'micro', label:'Microeconomic policy'},
    {id:'labour', label:'Labour market policy'},
    {id:'mix', label:'Management of the economy: policy mix'}]}
 ]}
];

const paths = {
  calculator:['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z','M8 7h8M8 11h1m3 0h1m3 0h.01M8 15h1m3 0h1m3 0h.01M8 18h1m3 0h1m3 0h.01'],
  file:['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z','M14 2v6h6M8 12h8M8 16h8M8 19h4'],
  folder:['M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
  user:['M20 21v-2a7 7 0 0 0-7-7h-2a7 7 0 0 0-7 7v2Z','M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  people:['M16 21v-2a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v2Z','M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM17 3a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5v2'],
  care:['M12 3v18M3 12h18','M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z'],
  sliders:['M3 5h4m4 0h10M3 12h10m4 0h4M3 19h4m4 0h10','M7 3v4m4 10v4m2-11v4'],
  save:['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z','M7 3v6h9V3M7 21v-8h10v8'],
  plus:['M12 5v14M5 12h14'],
  refresh:['M20 7a8 8 0 0 0-14-3L3 7m0-4v4h4M4 17a8 8 0 0 0 14 3l3-3m0 4v-4h-4'],
  back:['M19 12H5m7-7-7 7 7 7'],
  up:['M12 19V5m-6 6 6-6 6 6'],
  close:['M6 6l12 12M6 18 18 6'],
  history:['M3 10a9 9 0 1 1 2 8M3 3v7h7M12 7v5l3 2'],
  chevron:['m9 5 7 7-7 7'],
};
export function icon(name) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',class:'act-icon'}))svg.setAttribute(key,value);
  for(const d of paths[name] || paths.calculator){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}
  return svg;
}
export function decorateIcons(root=document) {
  root.querySelectorAll('[data-icon]').forEach(node=>node.replaceChildren(icon(node.dataset.icon)));
}

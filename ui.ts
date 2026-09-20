

const css = `

  @media (prefers-color-scheme: dark) {
    :root{
      --text-color: #e6d8c1;
      --background-color: #172033;
    }
  }

  :root{
    font-family: ui-monospace, Menlo, "SF Mono", Consolas, "Liberation Mono", monospace;
    color: var(--text-color);
    background: var(--background-color);
    --accent-color: #6e47cb;
    --hint-color: #f6f3ed;
    --text-color: #172033;
    --background-color: #e8e2cc;
    --color2: #74aa31;
    --color3: #9e4714;
    --color4: #09629a;

  }
`

document.head.append(Object.assign(document.createElement('style'), { textContent: css }));


export const palette = {
  text: "var(--text-color)",
  background: "var(--background-color)",
  accent: "var(--accent-color)",
  hint: "var(--hint-color)",
  colors: [
    "var(--text-color)",
    "var(--accent-color)",
    "var(--color2)",
    "var(--color3)",
    "var(--color4)",
  ]
}


type EL <K extends keyof HTMLElementTagNameMap> = {
  view: HTMLElementTagNameMap[K],
  replaceChildren: (...children: (EL<any> | string)[]) => EL<K>,
  append: (...children:( EL <any>  | string)[]) => EL<K>,
  assignProperties: (props: Partial<HTMLElementTagNameMap[K]>) => EL<K>,
  style: (styles: Partial<CSSStyleDeclaration>) => EL<K>
}


export function elFromHTML<K extends keyof HTMLElementTagNameMap>(html: HTMLElementTagNameMap[K]): EL<K> {

  let el = {
    view: html,
    replaceChildren: (...children: (EL<any> | string)[]) => {
      html.replaceChildren(...children.map(child => typeof child === 'string' ? child : child.view));
      return el;
    },
    append: (...children: (EL<any> | string)[]) => {
      children.forEach(child => html.append( typeof child === 'string' ? child : child.view));
      return el;
    },
    assignProperties: (props: Partial<HTMLElement>) => {
      Object.assign(html, props);
      return el;
    },
    style: (styles: Partial<CSSStyleDeclaration>) => {
      Object.assign(html.style, styles);
      return el;
    }
  }
  return el
}

export function elFromTag<K extends keyof HTMLElementTagNameMap> (tagName: K): EL<K> {
  const html = document.createElement(tagName);
  return elFromHTML(html);
}


const tagger =  <tag extends keyof HTMLElementTagNameMap>(tagName: tag) => (...s: (EL<any> | string)[])=> elFromTag(tagName).append(...s);


export const link = (s:string, href: string) => tagger('a')(s).style({ color: palette.text}).assignProperties({ href });
export const p = tagger('p');
export const span = tagger('span');
export const div = tagger('div');
export const pre = tagger('pre');
export const h1 = tagger('h1');
export const h2 = tagger('h2');
export const h3 = tagger('h3');

export const table = tagger('table')

export function textarea (placeholder = '') {
  return elFromTag('textarea')
    .style({ fontFamily: 'ui-monospace, Menlo, "SF Mono", Consolas, "Liberation Mono", monospace' })
    .append(placeholder)
}


export const body = elFromHTML(document.body as HTMLElement & { tagName: 'BODY' });

export const cursor = div().style({
  background: palette.accent,
  width: ".5em",
  height: ".9em",
  margin: "0 .1em",
})

export function navbar(items: Record<string, ()=> EL<any>>) {



  const entries = Object.entries(items);
  const bar = div().style({ display: "flex" });
  const page = div().style({
    padding: "0",
    margin: "0",
    border: `2px solid ${palette.hint}`,
    minHeight: "40em",
  });

  document.addEventListener("keydown", e=>{
    if (e.key == "Enter" && e.metaKey) render(selection == 1 ? 2: 1)
  })

  let selection = 0

  function render(sel=0){
    selection = sel;
    bar.replaceChildren();
    entries.forEach(([name, item], i) => {
      const but = span(name).style({
        cursor: "pointer",
        padding: ".2em .7em",
        borderRadius: "6px 6px 0 0 ",
      });
      if (i === selection) {
        page.replaceChildren(item());
        but.style({ background: palette.hint });
      }
      but.view.onclick = () => render(i);
      bar.append(but);
    });
  }

  const view = div().append(bar, page);
  const select = (name: string) => {
    const index = entries.findIndex(([entry]) => entry === name);
    if (index >= 0) render(index);
  };
  render();
  return Object.assign(view, { select });
}

export function niceList(items: [(EL<any> | string), Partial<HTMLElement>][]) {
  return div(
    ...items.map(([content, props], idx) => {
      const el = div(content).style({
        margin: ".2em 0",
        padding: ".2em .5em",
        cursor: "pointer",
        borderTop: idx > 0 ? `2px solid ${palette.hint}` : "none",
      });
      Object.assign(el.view, props);
      return el;
    })
  ).style({
    padding: "0 1em",
    margin: "1.5em",
    border: `2px solid ${palette.hint}`,
    borderRadius: "6px",
  });
}



export function niceTable (items: (EL<any> | string)[][]) {
  return div(table(
    ...items.map((row,i) => {
      return elFromTag( 'tr').append(
        ...row.map(cell => elFromTag(i==0?'th':'td').append(cell).style({
          border: `1px solid ${palette.hint}`,
          padding: ".2em .5em",
        }))
      );
    })
  ).style({
    borderCollapse: "collapse",
    width: "100%",
    textAlign: "left",
    border: `2px solid ${palette.hint}`,
    overflow: "hidden",
  })).style({
    border: `1px solid ${palette.hint}`,
    borderRadius: "6px",
    overflow: "hidden",
  })
}



let data = document.body.dataset.page;
if (data.indexOf("-") !== -1) {
  data = data.replace(/-/g, "/");
}
const dir = `/${data}/`;
export default function Pages() {
  import(`.${dir}`).then((module) => {
    module.default();
  });
}

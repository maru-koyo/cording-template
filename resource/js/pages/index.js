import TopPage from "./top";

const pageType = document.body.dataset.page;
export default function Pages() {
  if (pageType === "top") {
    TopPage();
  } else if (pageType === "about") {
  }
}

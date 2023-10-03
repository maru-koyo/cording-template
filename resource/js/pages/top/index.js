import Scrollbar from "smooth-scrollbar";

export default function TopPage() {
  Scrollbar.init(document.querySelector("#my-scrollbar"), { damping: 0.02 });
}

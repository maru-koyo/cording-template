import { gsap } from "gsap";
export default function TopPage() {
  gsap.to("h1", {
    duration: 1,
    opacity: 0,
  });
}

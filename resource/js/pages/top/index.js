import { gsap } from "gsap";
export default function TopPage() {
  gsap.fromTo(
    "h1",
    {
      opacity: 0,
    },
    { duration: 1, opacity: 1 },
  );
}

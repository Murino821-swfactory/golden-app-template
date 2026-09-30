import type { ComponentProps } from "react";
/** Browser harness only: navigation uses ordinary full-page links. */
export default function Link(props: ComponentProps<"a">) { return <a {...props} />; }

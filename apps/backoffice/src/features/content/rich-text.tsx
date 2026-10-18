import type { HTMLAttributes } from "react";
import { sanitizeRichText } from "./sanitize";

export function RichText({html, ...props}: Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML"> & {html: string}) {
 return <div {...props} dangerouslySetInnerHTML={{__html: sanitizeRichText(html)}} />;
}

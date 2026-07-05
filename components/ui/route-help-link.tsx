// Stub. Portal's version renders contextual help-article links from its
// business help system; this app has no help content (two users who built
// the thing). The drawer/form system passes helpArticleId through to here —
// rendering nothing keeps those call sites byte-identical to Portal.

export function RouteHelpLink(props: { articleId?: string | null; className?: string }) {
  void props
  return null
}

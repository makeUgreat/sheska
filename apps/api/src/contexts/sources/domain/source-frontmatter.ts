export type SourceFrontmatterValue =
  | null
  | string
  | number
  | boolean
  | SourceFrontmatterValue[]
  | { readonly [key: string]: SourceFrontmatterValue };

export type SourceFrontmatter = Readonly<
  Record<string, SourceFrontmatterValue>
>;

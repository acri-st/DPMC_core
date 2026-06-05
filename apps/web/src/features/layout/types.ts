export type NavItem = {
  to: string;
  label: string;
  /** Activation predicate against the current pathname. */
  matchPath: (pathname: string) => boolean;
  requiresAdmin?: boolean;
};

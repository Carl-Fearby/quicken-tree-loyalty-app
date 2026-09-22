type Props = {
  current: string;
  onSettings?: () => void;
  parent?: string;
  onParent?: () => void;
  showSettings?: boolean;
};

export function Breadcrumbs({ current, onSettings, parent, onParent, showSettings = true }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      {showSettings && (
        <>
          {onSettings ? (
            <button type="button" onClick={onSettings}>
              Settings
            </button>
          ) : (
            <span>Settings</span>
          )}
          <span aria-hidden="true">/</span>
        </>
      )}
      {parent && onParent ? (
        <>
          <button type="button" onClick={onParent}>
            {parent}
          </button>
          <span aria-hidden="true">/</span>
        </>
      ) : null}
      <span aria-current="page">{current}</span>
    </nav>
  );
}

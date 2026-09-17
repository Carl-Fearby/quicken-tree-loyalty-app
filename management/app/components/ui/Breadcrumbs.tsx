type Props = {
  current: string;
  onSettings: () => void;
  parent?: string;
  onParent?: () => void;
};

export function Breadcrumbs({ current, onSettings, parent, onParent }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <button type="button" onClick={onSettings}>
        Settings
      </button>
      <span aria-hidden="true">/</span>
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

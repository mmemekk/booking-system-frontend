
export default function SideMenu({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div>
      <h1 className="font-noto"> Side bar</h1>
      <h1 className="font-open"> Side bar</h1>
      <h1 className="font-prompt"> Side bar</h1>
      {children}
    </div>


  );
}

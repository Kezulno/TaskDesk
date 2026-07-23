interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="border-border border-b px-5 py-5 xl:px-8 xl:py-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 max-w-3xl text-sm break-words">{description}</p>
    </header>
  );
}

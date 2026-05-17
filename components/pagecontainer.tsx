interface PageContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}

export function PageContainer({ title, description, children, actionButton }: PageContainerProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#efe7d4] bg-white/80 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <span className="inline-flex w-fit items-center rounded-full bg-[#fff6dc] px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#9a6b00]">
            Sunflower Overview
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actionButton && <div className="shrink-0">{actionButton}</div>}
      </div>

      <div className="space-y-6">{children}</div>
    </section>
  );
}

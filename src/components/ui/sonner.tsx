import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-[3px] group-[.toaster]:border-border group-[.toaster]:rounded-xl group-[.toaster]:font-medium group-[.toaster]:shadow-[5px_5px_0_0_var(--shadow-ink)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:border-[2px] group-[.toast]:border-border group-[.toast]:font-bold",
          cancelButton:
            "group-[.toast]:bg-surface-2 group-[.toast]:text-foreground group-[.toast]:rounded-lg group-[.toast]:border-[2px] group-[.toast]:border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

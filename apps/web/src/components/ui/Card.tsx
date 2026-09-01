import type { HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ((
  props: CardProps,
  ref: React.Ref<HTMLDivElement>,
) => {
  const { className = "", children, ...rest } = props;
  return (
    <div ref={ref} className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}) as ForwardRefExoticComponent<CardProps & RefAttributes<HTMLDivElement>>;

Card.displayName = "Card";

export const CardHeader = ((
  props: HTMLAttributes<HTMLDivElement>,
  ref: React.Ref<HTMLDivElement>,
) => {
  const { className = "", children, ...rest } = props;
  return (
    <div ref={ref} className={`px-6 py-4 border-b border-gray-100 ${className}`} {...rest}>
      {children}
    </div>
  );
}) as ForwardRefExoticComponent<HTMLAttributes<HTMLDivElement> & RefAttributes<HTMLDivElement>>;

CardHeader.displayName = "CardHeader";

export const CardContent = ((
  props: HTMLAttributes<HTMLDivElement>,
  ref: React.Ref<HTMLDivElement>,
) => {
  const { className = "", children, ...rest } = props;
  return (
    <div ref={ref} className={`p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}) as ForwardRefExoticComponent<HTMLAttributes<HTMLDivElement> & RefAttributes<HTMLDivElement>>;

CardContent.displayName = "CardContent";
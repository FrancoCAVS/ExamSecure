import Link from 'next/link';
import { LogoIcon } from '@/components/icons/LogoIcon';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function Logo({ className, iconClassName, textClassName, showText = true }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm", className)}>
      <LogoIcon className={cn("h-8 w-8 text-primary", iconClassName)} />
      {showText && <span className={cn("text-2xl font-headline font-semibold text-primary", textClassName)}>ExamSecure</span>}
    </Link>
  );
}

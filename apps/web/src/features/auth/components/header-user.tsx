import { UserAvatar } from '@/features/auth/components/user-avatar';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';

export function HeaderUser() {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2 pl-2">
      <div className="hidden flex-col items-end text-xs leading-tight sm:flex">
        <span className="font-medium">{user.displayName}</span>
        <span className="text-muted-foreground">{user.email}</span>
      </div>
      <UserAvatar src={user.avatarUrl} displayName={user.displayName} />
    </div>
  );
}

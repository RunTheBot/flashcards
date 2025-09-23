"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { LayoutDashboard, LogOut, Settings, User } from "lucide-react";

export function UserMenu() {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<div className="animate-pulse">
				<div className="h-8 w-8 rounded-full bg-muted" />
			</div>
		);
	}

	if (!session) {
		return (
			<div className="flex items-center gap-2">
				<Button variant="ghost" asChild>
					<a href="/auth/signin">Sign In</a>
				</Button>
				<Button asChild>
					<a href="/auth/signup">Sign Up</a>
				</Button>
			</div>
		);
	}

	const handleSignOut = async () => {
		await signOut();
		window.location.href = "/";
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={session.user.image || ""}
							alt={session.user.name || ""}
						/>
						<AvatarFallback>
							{session.user.name?.charAt(0).toUpperCase() || "U"}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col gap-1">
						<p className="font-medium text-sm leading-none">
							{session.user.name}
						</p>
						<p className="text-muted-foreground text-xs leading-none">
							{session.user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<a href="/dashboard" className="cursor-pointer">
						<LayoutDashboard className="mr-2 h-4 w-4" />
						<span>Dashboard</span>
					</a>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<a href="/profile" className="cursor-pointer">
						<User className="mr-2 h-4 w-4" />
						<span>Profile</span>
					</a>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<a href="/settings" className="cursor-pointer">
						<Settings className="mr-2 h-4 w-4" />
						<span>Settings</span>
					</a>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
					<LogOut className="mr-2 h-4 w-4" />
					<span>Sign Out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

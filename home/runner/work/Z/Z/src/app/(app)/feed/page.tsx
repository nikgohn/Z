'use client';

import { PostCard } from "@/components/post-card";
import { useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { Post } from "@/types";
import { collection, orderBy, query } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedPage() {
    const firestore = useFirestore();

    const postsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: postsFromHook, isLoading } = useCollection<any>(postsQuery);

    const posts: Post[] | null = postsFromHook
        ? postsFromHook.map(post => {
            const data = post;
            const createdAt = data.createdAt?.toDate?.().toISOString() || new Date().toISOString();
            const updatedAt = data.updatedAt?.toDate?.().toISOString() || new Date().toISOString();
            return {
                ...data,
                id: post.id,
                createdAt,
                updatedAt,
            } as Post;
        })
        : null;

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl">
                <header className="border-b border-border/50 p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                    <h1 className="text-xl font-bold">Лента</h1>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col space-y-3">
                            <Skeleton className="h-52 w-full rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl">
            <header className="border-b border-border/50 p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                <h1 className="text-xl font-bold">Лента</h1>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
                {posts && posts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>
             {posts && posts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground mt-10">
                    <p>Здесь пока тихо...</p>
                    <p className="text-sm">Создайте первую запись!</p>
                </div>
            )}
        </div>
    );
}

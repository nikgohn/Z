'use client';

import { Post, UserProfile, Comment } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/components/auth-provider";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, onSnapshot, Timestamp, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";

export function PostView({ post, author }: { post: Post, author: UserProfile | null }) {
    const mediaUrl = post.mediaUrls && post.mediaUrls[0];
    const mediaType = post.mediaTypes && post.mediaTypes[0];

    const { user, userProfile } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isLiked, setIsLiked] = React.useState(false);
    const [likeCount, setLikeCount] = React.useState(post.likedBy?.length ?? 0);
    const [comments, setComments] = React.useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = React.useState(true);
    const [newComment, setNewComment] = React.useState('');
    const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);

    React.useEffect(() => {
        if (user && post.likedBy) {
            setIsLiked(post.likedBy.includes(user.uid));
        }
        setLikeCount(post.likedBy?.length ?? 0);
    }, [post, user]);

    React.useEffect(() => {
        if (!firestore || !post.id) return;
        setCommentsLoading(true);
        const q = query(collection(firestore, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setComments(data);
            setCommentsLoading(false);
        });
        return () => unsubscribe();
    }, [firestore, post.id]);

    const handleLike = async () => {
        if (!user || !firestore) return;
        const postRef = doc(firestore, 'posts', post.id);
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
        try {
            await updateDoc(postRef, { likedBy: newStatus ? arrayUnion(user.uid) : arrayRemove(user.uid) });
        } catch (e) {
            setIsLiked(!newStatus);
            setLikeCount(prev => newStatus ? prev - 1 : prev + 1);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;
        setIsSubmittingComment(true);
        try {
            await addDoc(collection(firestore, 'posts', post.id, 'comments'), {
                userId: user.uid,
                text: newComment.trim(),
                createdAt: serverTimestamp(),
            });
            setNewComment('');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[90vh] w-full max-w-5xl mx-auto rounded-xl overflow-hidden relative bg-[#1a2e25] border border-white/10 shadow-2xl">
            
            {/* ЛЕВАЯ КОЛОНКА: Единый скролл для фото и текста */}
            <div className="w-full md:w-1/2 h-full border-r border-white/5 relative bg-[#1a2e25]">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                    {/* Блок картинки */}
                    {mediaUrl && (
                        <div className="relative w-full bg-black/20 border-b border-white/5">
                            {mediaType === 'image' ? (
                                <img 
                                    src={mediaUrl} 
                                    alt="Контент" 
                                    className="w-full h-auto object-contain block" 
                                />
                            ) : (
                                <video src={mediaUrl} className="w-full h-auto" controls />
                            )}
                        </div>
                    )}
                    
                    {/* Блок текста */}
                    {post.caption && (
                        <div className="p-6 md:p-8">
                            <p className="text-base md:text-lg leading-relaxed text-zinc-100 whitespace-pre-wrap">
                                {post.caption}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ПРАВАЯ КОЛОНКА: Автор, Лайки и Комменты */}
            <div className="w-full md:w-1/2 flex flex-col bg-[#13231c] h-full">
                
                {/* Хедер автора и лайк */}
                <div className="p-4 border-b border-white/5 bg-black/10">
                    {author && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 ring-1 ring-white/10">
                                    <AvatarImage src={author.profilePictureUrl || undefined} />
                                    <AvatarFallback className="bg-[#1a2e25] text-zinc-400">
                                        {author.nickname?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/profile/${author.nickname}`} className="font-bold text-white hover:text-green-400 block truncate">
                                        @{author.nickname}
                                    </Link>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                                        {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru }) : 'только что'}
                                    </p>
                                </div>
                            </div>
                            
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={handleLike} 
                                className={cn(
                                    "w-fit gap-2 rounded-full px-4 hover:bg-white/5 transition-all",
                                    isLiked ? "text-red-500 bg-red-500/10" : "text-zinc-400"
                                )}
                            >
                                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                                <span className="font-bold">{likeCount}</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Список комментариев */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {commentsLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-700" /></div>
                    ) : comments.length === 0 ? (
                         <div className="text-center py-16 text-zinc-500 text-sm italic">Здесь пока пусто...</div>
                    ) : (
                        comments.map((comment: any) => (
                            <div key={comment.id} className="flex gap-3 animate-in fade-in">
                                <div className="bg-[#1a2e25] rounded-2xl px-4 py-2 border border-white/5 max-w-[90%] shadow-sm">
                                    <p className="text-[11px] font-bold text-green-500/70 mb-0.5">
                                        @{comment.userId ? "user_" + comment.userId.slice(0, 4) : "аноним"}
                                    </p>
                                    <p className="text-sm text-zinc-200 break-words leading-snug">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Ввод комментария */}
                <div className="p-4 bg-black/20 border-t border-white/5">
                    <form onSubmit={handleCommentSubmit} className="flex items-end gap-2 bg-[#1a2e25] rounded-2xl p-2 border border-white/10 focus-within:border-green-500/50 transition-colors">
                        <Textarea 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Написать..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCommentSubmit(e as any);
                                }
                            }}
                            className="min-h-[40px] max-h-[120px] resize-none bg-transparent border-none focus-visible:ring-0 text-sm py-2 text-white"
                            rows={1}
                        />
                        <Button 
                            type="submit" 
                            size="sm" 
                            className="rounded-xl h-10 bg-zinc-100 text-black hover:bg-white font-bold"
                            disabled={!newComment.trim() || isSubmittingComment}
                        >
                            {isSubmittingComment ? <Loader2 className="animate-spin h-4 w-4"/> : 'ОК'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
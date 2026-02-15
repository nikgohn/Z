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
import { Heart, Loader2, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";

export function PostView({ post, author }: { post: Post, author: UserProfile | null }) {
    const mediaUrls = post.mediaUrls || [];
    const mediaTypes = post.mediaTypes || [];

    const { user, userProfile } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isLiked, setIsLiked] = React.useState(false);
    const [likeCount, setLikeCount] = React.useState(post.likedBy?.length ?? 0);
    const [comments, setComments] = React.useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = React.useState(true);
    const [newComment, setNewComment] = React.useState('');
    const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isImageExpanded, setIsImageExpanded] = React.useState(false);

    React.useEffect(() => {
        if (user && post.likedBy) {
            setIsLiked(post.likedBy.includes(user.uid));
        }
        setLikeCount(post.likedBy?.length ?? 0);
    }, [post, user]);

    React.useEffect(() => {
        if (!firestore || !post.id) return;

        setCommentsLoading(true);
        const commentsQuery = query(collection(firestore, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
        
        const unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
            const commentsData = snapshot.docs.map(doc => {
                const data = doc.data();
                const createdAt = data.createdAt instanceof Timestamp 
                    ? data.createdAt.toDate().toISOString() 
                    : new Date().toISOString();
                return {
                    id: doc.id,
                    ...data,
                    createdAt,
                } as Comment;
            });

            const commentsWithAuthors = await Promise.all(commentsData.map(async (comment) => {
                if (!comment.userId) return comment;
                try {
                    const userDoc = await getDoc(doc(firestore, 'users', comment.userId));
                    if (userDoc.exists()) {
                        const authorData = userDoc.data();
                        const profile : UserProfile = {
                            id: userDoc.id,
                            nickname: authorData.nickname,
                            profilePictureUrl: authorData.profilePictureUrl,
                            createdAt: authorData.createdAt?.toDate ? authorData.createdAt.toDate().toISOString() : new Date().toISOString(),
                            followingUserIds: authorData.followingUserIds || [],
                            followerUserIds: authorData.followerUserIds || [],
                        }
                        return { ...comment, author: profile };
                    }
                } catch (e) {
                    console.error("Error fetching comment author", e);
                }
                return comment;
            }));

            setComments(commentsWithAuthors);
            setCommentsLoading(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            setCommentsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, post.id]);


    const handleLike = async () => {
        if (!user || !firestore) {
            toast({ title: "Чтобы поставить лайк, необходимо войти.", variant: "destructive" });
            return;
        }

        const postRef = doc(firestore, 'posts', post.id);
        const newLikeStatus = !isLiked;

        setIsLiked(newLikeStatus);
        setLikeCount(currentCount => newLikeStatus ? currentCount + 1 : currentCount - 1);

        try {
            if (newLikeStatus) {
                await updateDoc(postRef, {
                    likedBy: arrayUnion(user.uid)
                });
            } else {
                await updateDoc(postRef, {
                    likedBy: arrayRemove(user.uid)
                });
            }
        } catch (error: any) {
            setIsLiked(!newLikeStatus);
            setLikeCount(currentCount => newLikeStatus ? currentCount - 1 : currentCount + 1);
            toast({ title: "Не удалось обновить статус лайка.", description: error.message, variant: "destructive" });
            console.error("Error updating like status:", error);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile || !newComment.trim()) return;

        setIsSubmittingComment(true);
        try {
            await addDoc(collection(firestore, 'posts', post.id, 'comments'), {
                postId: post.id,
                userId: user.uid,
                text: newComment.trim(),
                createdAt: serverTimestamp(),
            });
            setNewComment('');
        } catch (error: any) {
            toast({
                title: 'Не удалось добавить комментарий',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsSubmittingComment(false);
        }
    };
    
    const mediaUrl = mediaUrls[currentIndex] || null;

    const handleImageContainerClick = () => {
        if (mediaUrls.length > 0 && mediaTypes.every(t => t === 'image')) {
            setIsImageExpanded(!isImageExpanded);
        }
    }

    return (
        <div className="flex flex-col md:flex-row h-[90vh] w-full max-w-5xl mx-auto rounded-xl overflow-hidden relative bg-card border border-border shadow-2xl">
            {/* Image/Video Container */}
            <div
              className={cn(
                "transition-all duration-500 ease-in-out flex items-center justify-center overflow-hidden",
                "bg-muted",
                isImageExpanded
                  ? "fixed inset-0 z-50 bg-black/80"
                  : "relative md:w-1/2 w-full md:rounded-l-xl md:rounded-tr-none rounded-t-xl",
                mediaTypes.every(t => t === 'image') && "cursor-pointer"
              )}
              onClick={handleImageContainerClick}
            >
              {mediaUrl && (
                <>
                  <div className="relative w-full h-full">
                    {mediaTypes[currentIndex] === 'image' ? (
                      <Image
                        src={mediaUrl}
                        alt={post.caption || `Post media ${currentIndex + 1}`}
                        fill
                        className={cn(
                          "transition-transform duration-500",
                          isImageExpanded ? "object-contain scale-100" : "object-cover scale-100"
                        )}
                        priority
                        unoptimized
                      />
                    ) : mediaTypes[currentIndex] === 'video' ? (
                       <video src={mediaUrl} className="w-full h-full object-contain" controls autoPlay loop playsInline />
                    ) : null }
                  </div>

                  {mediaUrls.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(i => (i - 1 + mediaUrls.length) % mediaUrls.length);
                        }}
                        className="absolute top-1/2 left-4 -translate-y-1/2 z-50 p-2 bg-black/30 rounded-full text-white hover:bg-black/50"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(i => (i + 1) % mediaUrls.length);
                        }}
                        className="absolute top-1/2 right-4 -translate-y-1/2 z-50 p-2 bg-black/30 rounded-full text-white hover:bg-black/50"
                      >
                        <ChevronRight className="h-6 w-6"/>
                      </button>
                    </>
                  )}
                </>
              )}
               {!mediaUrl && post.caption && (
                 <div className="p-6">
                    <p className="text-base md:text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                        {post.caption}
                    </p>
                </div>
               )}
            </div>

            {/* Details and Comments Container */}
            <div className={cn(
                "w-full md:w-1/2 flex flex-col bg-card h-full transition-opacity duration-500",
                isImageExpanded && "opacity-0 invisible"
            )}>
                 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                  {author && (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 ring-1 ring-border flex-shrink-0">
                          <AvatarImage src={author.profilePictureUrl || undefined} />
                          <AvatarFallback className="bg-background text-muted-foreground">
                            {author.nickname?.[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col">
                          <Link
                            href={`/profile/${author.nickname}`}
                            className="font-bold text-foreground hover:text-primary transition-colors"
                          >
                            @{author.nickname}
                          </Link>

                          <p className="text-xs text-muted-foreground mt-1">
                            {post.createdAt
                              ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru })
                              : "только что"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleLike}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1",
                          "bg-transparent border-none shadow-none",
                          "hover:bg-transparent active:bg-transparent",
                          "focus:outline-none focus-visible:ring-0",
                          "transition-colors",
                          isLiked
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-5 w-5 transition-colors",
                            isLiked && "fill-current"
                          )}
                        />
                        <span className="text-sm font-semibold">
                          {likeCount}
                        </span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 comments-scrollbar min-h-0">
                    {mediaUrl && post.caption && (
                        <div className="pb-4 border-b border-border">
                            <p className="text-base whitespace-pre-wrap text-foreground">
                                {post.caption}
                            </p>
                        </div>
                    )}
                    {commentsLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                    ) : comments.length === 0 ? (
                         <div className="text-center py-16 text-muted-foreground text-sm">Комментариев пока нет. Будьте первым!</div>
                    ) : (
                        comments.map((comment: Comment) => (
                            <div key={comment.id} className="flex gap-3 animate-in fade-in">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src={comment.author?.profilePictureUrl || undefined} />
                                    <AvatarFallback className="bg-background">{comment.author?.nickname?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="bg-muted/50 rounded-2xl px-4 py-2 inline-block max-w-full border border-border">
                                        <p className="text-xs font-bold text-foreground mb-0.5">@{comment.author?.nickname || 'user'}</p>
                                        <p className="text-sm text-foreground break-words">{comment.text}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {userProfile && (
                    <div className="p-4 border-t border-border">
                        <form onSubmit={handleCommentSubmit} className="flex gap-2">
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Добавить комментарий..."
                                className="min-h-[40px] resize-none text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmittingComment}
                                className={cn(
                                    "flex items-center justify-center px-4 rounded-xl transition-colors",
                                    newComment.trim()
                                        ? "text-primary hover:text-primary/80"
                                        : "text-muted-foreground cursor-not-allowed"
                                 )}
                            >
                                 {isSubmittingComment ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </button>

                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

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
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Heart, Send } from "lucide-react";
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
  const [newComment, setNewComment] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const mediaUrl = mediaUrls[currentIndex] || null;

  /* =======================
     LIKE LOGIC
  ======================== */
  React.useEffect(() => {
    if (user && post.likedBy) {
      setIsLiked(post.likedBy.includes(user.uid));
    }
    setLikeCount(post.likedBy?.length ?? 0);
  }, [post, user]);

  const handleLike = async () => {
    if (!user) return;

    const postRef = doc(firestore, "posts", post.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid)
        });
        setLikeCount(prev => prev - 1);
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid)
        });
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch {
      toast({ title: "Ошибка лайка" });
    }
  };

  /* =======================
     LOAD COMMENTS
  ======================== */
  React.useEffect(() => {
    const q = query(
      collection(firestore, "posts", post.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];

      setComments(data);
    });

    return () => unsub();
  }, [firestore, post.id]);

  /* =======================
     ADD COMMENT
  ======================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !userProfile) return;

    await addDoc(collection(firestore, "posts", post.id, "comments"), {
      text: newComment,
      authorId: user.uid,
      authorNickname: userProfile.nickname,
      authorAvatar: userProfile.profilePictureUrl || null,
      createdAt: serverTimestamp()
    });

    setNewComment('');
  };

  return (
    <div className="flex flex-col md:flex-row h-[90vh] w-full max-w-5xl mx-auto rounded-xl overflow-hidden bg-[#40594D] border border-border shadow-2xl">

      {/* ===== LEFT IMAGE BLOCK ===== */}
      {mediaUrl && mediaTypes[currentIndex] === 'image' && (
        <div className="relative md:w-1/2 w-full flex items-center justify-center overflow-hidden">
          <Image
            src={mediaUrl}
            alt={post.caption || "Изображение"}
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>
      )}

      {/* ===== RIGHT PANEL ===== */}
      <div className="w-full md:w-1/2 flex flex-col bg-card h-full">

        {/* HEADER */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          {author && (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={author.profilePictureUrl || undefined} />
                  <AvatarFallback>
                    {author.nickname?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <Link
                    href={`/profile/${author.nickname}`}
                    className="font-bold"
                  >
                    @{author.nickname}
                  </Link>

                  <p className="text-xs text-muted-foreground">
                    {post.createdAt
                      ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru })
                      : "только что"}
                  </p>
                </div>
              </div>

              {/* LIKE */}
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-2",
                  isLiked ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                <span>{likeCount}</span>
              </button>
            </>
          )}
        </div>

        {/* COMMENTS LIST (ПРАВАЯ ЧАСТЬ) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {post.caption && (
            <div className="pb-4 border-b border-border">
              <p className="whitespace-pre-wrap">{post.caption}</p>
            </div>
          )}

          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.authorAvatar || undefined} />
                <AvatarFallback>
                  {comment.authorNickname?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="text-sm font-semibold">
                  @{comment.authorNickname}
                </p>
                <p className="text-sm">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* COMMENT INPUT */}
        {userProfile && (
          <div className="p-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Добавить комментарий..."
                className="min-h-[40px] resize-none text-sm"
              />

              <button
                type="submit"
                className="p-3 bg-primary text-primary-foreground rounded-xl"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Heart, Loader2, Send } from "lucide-react";

import { Post, UserProfile, Comment } from "@/types";
import { useAuth } from "@/components/auth-provider";
import { useFirestore } from "@/firebase";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";

export function PostView({
  post,
  author,
  isFeedCard = false, // 🔴 ВАЖНО
}: {
  post: Post;
  author: UserProfile | null;
  isFeedCard?: boolean;
}) {
  const firestore = useFirestore();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const [isImageExpanded, setIsImageExpanded] = React.useState(false);

  const mediaUrl = post.mediaUrls?.[0] ?? null;

  /* ================= COMMENTS SUBSCRIPTION ================= */
  React.useEffect(() => {
    const q = query(
      collection(firestore, "posts", post.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Comment[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Comment, "id">)
      }));
      setComments(list);
    });

    return () => unsub();
  }, [firestore, post.id]);

  /* ================= SEND COMMENT ================= */
  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      setSending(true);
      await addDoc(
        collection(firestore, "posts", post.id, "comments"),
        {
          text: newComment.trim(),
          userId: user.uid,
          createdAt: serverTimestamp()
        }
      );
      setNewComment("");
    } catch {
      toast({
        title: "Ошибка",
        description: "Комментарий не отправлен",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  /* ================= LAYOUT ================= */
  return (
    <div className="flex w-full rounded-xl overflow-hidden border bg-card">

      {/* ========== LEFT: IMAGE (ВСЕГДА СЛЕВА В ЛЕНТЕ) ========== */}
      {mediaUrl && (
        <div
          className={cn(
            "relative bg-black overflow-hidden transition-all duration-500",
            isFeedCard ? "w-1/2" : "w-1/2 cursor-pointer",
            isImageExpanded && !isFeedCard && "fixed inset-0 z-50"
          )}
          onClick={() => !isFeedCard && setIsImageExpanded(!isImageExpanded)}
        >
          <Image
            src={mediaUrl}
            alt=""
            fill
            className={cn(
              "transition-all duration-500",
              isImageExpanded ? "object-contain" : "object-cover"
            )}
            unoptimized
          />
        </div>
      )}

      {/* ========== RIGHT: CONTENT ========== */}
      <div className="flex w-1/2 flex-col">

        {/* HEADER */}
        {author && (
          <div className="p-4 border-b flex gap-3 items-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src={author.profilePictureUrl ?? undefined} />
              <AvatarFallback>{author.nickname[0]}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <Link href={`/profile/${author.nickname}`} className="font-semibold">
                @{author.nickname}
              </Link>
              <p className="text-xs text-muted-foreground">
                {post.createdAt &&
                  formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                    locale: ru,
                  })}
              </p>
            </div>
          </div>
        )}

        {/* CAPTION */}
        {post.caption && (
          <div className="p-4 border-b text-sm whitespace-pre-wrap">
            {post.caption}
          </div>
        )}

        {/* COMMENTS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="text-sm">
              <span className="font-medium mr-1">{c.userId}</span>
              {c.text}
            </div>
          ))}
        </div>

        {/* INPUT */}
        {userProfile && (
          <form onSubmit={sendComment} className="p-3 border-t flex gap-2">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Комментарий..."
              className="resize-none min-h-[38px]"
            />

            <button
              type="submit"
              disabled={!newComment.trim() || sending}
              className={cn(
                "flex items-center justify-center transition",
                newComment.trim()
                  ? "text-primary hover:scale-110"
                  : "text-muted-foreground"
              )}
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

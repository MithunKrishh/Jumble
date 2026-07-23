import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { dashboardStorage } from "@/services/dashboardStorage";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ExamContext {
  id: string;
  user_id: string;
  exam_name: string;
  exam_date: string;
  subjects: string[];
  daily_study_hours: number | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  examContext: ExamContext | null;
  isLoading: boolean;
  hasCompletedSetup: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshExamContext: () => Promise<void>;
  refreshSetupStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [examContext, setExamContext] = useState<ExamContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupStatusVersion, setSetupStatusVersion] = useState(0);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  };

  const fetchExamContext = async (userId: string) => {
    const { data, error } = await supabase
      .from("exam_contexts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setExamContext(data);
    } else {
      setExamContext(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const refreshExamContext = async () => {
    if (user) {
      await fetchExamContext(user.id);
    }
  };

  const refreshSetupStatus = () => {
    setSetupStatusVersion((current) => current + 1);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchExamContext(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setExamContext(null);
        }

        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setExamContext(null);
  };

  const isResetRequested = user ? dashboardStorage.isSetupResetRequested(user.id) : false;
  const hasCompletedSetup = !!examContext && !!user && !isResetRequested;

  // This reference ensures context consumers re-evaluate setup state after local reset toggles.
  void setupStatusVersion;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        examContext,
        isLoading,
        hasCompletedSetup,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshExamContext,
        refreshSetupStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

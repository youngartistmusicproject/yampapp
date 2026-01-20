import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Copy } from "lucide-react";

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrollmentComplete: () => void;
}

export function TwoFactorSetup({ open, onOpenChange, onEnrollmentComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"enroll" | "verify">("enroll");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    if (open) {
      setStep("enroll");
      setQrCode("");
      setSecret("");
      setFactorId("");
      setVerificationCode("");
    }
  }, [open]);

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep("verify");
      }
    } catch (error: any) {
      console.error("MFA enrollment error:", error);
      toast.error(error.message || "Failed to start 2FA enrollment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      toast.success("Two-factor authentication enabled successfully!");
      onEnrollmentComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("MFA verification error:", error);
      toast.error(error.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {step === "enroll" ? "Enable Two-Factor Authentication" : "Verify Your Authenticator"}
          </DialogTitle>
          <DialogDescription>
            {step === "enroll"
              ? "Add an extra layer of security to your account using an authenticator app."
              : "Enter the 6-digit code from your authenticator app to complete setup."}
          </DialogDescription>
        </DialogHeader>

        {step === "enroll" && !qrCode && (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
            </p>
            <Button onClick={handleEnroll} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        )}

        {step === "verify" && qrCode && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg border" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app
              </p>
              <p className="text-xs text-muted-foreground">
                Or enter this secret manually:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                  {secret}
                </code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copySecret}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
          </div>
        )}

        {step === "verify" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={isLoading || verificationCode.length !== 6}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Enable"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

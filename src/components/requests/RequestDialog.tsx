import { useState } from "react";
import { Request } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: Omit<Request, 'id' | 'createdAt' | 'status'>) => void;
}

export function RequestDialog({ open, onOpenChange, onSubmit }: RequestDialogProps) {
  const [type, setType] = useState<Request["type"]>("time-off");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      title,
      description,
      requestedBy: { id: "current", name: "Current User", email: "user@example.com", role: "staff" },
    });
    // Reset form
    setType("time-off");
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <div className="px-4 sm:px-6 pt-5 sm:pt-6">
          <DialogHeader>
            <DialogTitle>Submit New Request</DialogTitle>
            <DialogDescription>
              Fill in the details for your request. It will be reviewed by an administrator.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-4 sm:px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Request Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Request["type"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time-off">Time Off</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="lesson-change">Lesson Change</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief summary of your request"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide more details about your request..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-6 py-4 border-t border-border/50 safe-area-pb">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="max-sm:h-12 max-sm:text-base max-sm:flex-1">
              Cancel
            </Button>
            <Button type="submit" className="max-sm:h-12 max-sm:text-base max-sm:flex-1">Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

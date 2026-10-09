import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";

export default function ApiAuth() {
  const navigate = useNavigate();
  const [inputHidden, setInputHidden] = useState(true);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const apiKey = formData.get("api-key")?.toString();

    if (!apiKey) return;

    localStorage.setItem(
      import.meta.env.VITE_API_STORAGE_KEY ?? "blog-studio-apikey",
      apiKey,
    );
    navigate("/");
  };

  return (
    <div className="min-h-svh flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>API Authorization Key</CardTitle>
          <CardDescription>
            This key is required to perform mutations using the blog studio api.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <InputGroup>
              <InputGroupInput
                id="api-key-input"
                name="api-key"
                placeholder="Enter key..."
                type={inputHidden ? "password" : "text"}
                maxLength={100}
                required
                autoComplete="off"
              />
              <InputGroupAddon align={"inline-end"}>
                <Button
                  size={"icon"}
                  variant={"link"}
                  onClick={() => setInputHidden((prev) => !prev)}
                >
                  {inputHidden ? <EyeIcon /> : <EyeOffIcon />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            <Button type="submit">Submit</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

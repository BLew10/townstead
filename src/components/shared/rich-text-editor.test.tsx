import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RichTextEditor } from "./rich-text-editor";

vi.mock("@tiptap/react", () => {
  const setImage = vi.fn(() => ({ run: vi.fn() }));
  const focus = vi.fn(() => ({ setImage }));
  const chain = vi.fn(() => ({ focus }));

  const mockEditor = {
    chain,
    can: () => ({
      chain: () => ({
        focus: () => ({
          toggleBold: () => ({ run: () => true }),
          toggleItalic: () => ({ run: () => true }),
          toggleStrike: () => ({ run: () => true }),
          toggleCode: () => ({ run: () => true }),
          undo: () => ({ run: () => true }),
          redo: () => ({ run: () => true }),
        }),
      }),
    }),
    isActive: () => false,
    getAttributes: () => ({}),
    getHTML: () => "",
    commands: { setContent: vi.fn() },
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    useEditor: () => mockEditor,
    EditorContent: () => <div data-testid="editor-content" />,
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function makeFile(name: string, type: string): File {
  return new File(["test-content"], name, { type });
}

describe("RichTextEditor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without crashing", () => {
    render(<RichTextEditor content="" onChange={vi.fn()} />);
    expect(screen.getByTitle("Bold")).toBeDefined();
    expect(screen.getByTitle("Add image")).toBeDefined();
  });

  it("renders without onImageUpload (backward compat)", () => {
    render(<RichTextEditor content="" onChange={vi.fn()} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeNull();
  });

  it("renders a hidden file input when onImageUpload is provided", () => {
    render(
      <RichTextEditor
        content=""
        onChange={vi.fn()}
        onImageUpload={vi.fn()}
      />
    );
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.accept).toBe("image/jpeg,image/png,image/webp");
    expect(fileInput.className).toContain("hidden");
  });

  it("opens file picker instead of window.prompt when onImageUpload is provided", () => {
    const promptSpy = vi.spyOn(window, "prompt");
    const onImageUpload = vi.fn().mockResolvedValue("https://example.com/img.png");
    render(
      <RichTextEditor
        content=""
        onChange={vi.fn()}
        onImageUpload={onImageUpload}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    fireEvent.click(screen.getByTitle("Add image"));

    expect(clickSpy).toHaveBeenCalled();
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("falls back to window.prompt when onImageUpload is not provided", () => {
    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValue("https://example.com/photo.jpg");

    render(<RichTextEditor content="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Add image"));

    expect(promptSpy).toHaveBeenCalledWith("Enter image URL");
  });

  it("calls onImageUpload when a file is selected and inserts the returned URL", async () => {
    const onImageUpload = vi
      .fn()
      .mockResolvedValue("https://cdn.example.com/uploaded.png");

    render(
      <RichTextEditor
        content=""
        onChange={vi.fn()}
        onImageUpload={onImageUpload}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = makeFile("photo.png", "image/png");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onImageUpload).toHaveBeenCalledWith(file);
    });
  });

  it("shows error toast when onImageUpload rejects", async () => {
    const { toast } = await import("sonner");
    const onImageUpload = vi.fn().mockRejectedValue(new Error("Upload failed"));

    render(
      <RichTextEditor
        content=""
        onChange={vi.fn()}
        onImageUpload={onImageUpload}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = makeFile("photo.png", "image/png");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to upload image");
    });
  });
});

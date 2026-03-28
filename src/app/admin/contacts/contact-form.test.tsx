import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ContactCategoryCombobox } from "./contact-form";

function CategoryFieldHarness() {
  const form = useForm({ defaultValues: { categoryId: "" } });
  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <ContactCategoryCombobox
                field={field}
                categoryOpen={false}
                onCategoryOpenChange={() => {}}
                categoryMap={new Map()}
                businessCategories={[]}
              />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

describe("ContactCategoryCombobox", () => {
  it("does not nest button inside button (PopoverTrigger render + Button)", () => {
    const { container } = render(<CategoryFieldHarness />);
    for (const btn of container.querySelectorAll("button")) {
      expect(btn.querySelector("button")).toBeNull();
    }
  });
});

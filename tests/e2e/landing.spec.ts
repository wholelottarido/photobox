import {test,expect} from "@playwright/test";
test("landing exposes primary journey",async({page})=>{await page.goto("/");await expect(page.getByRole("heading",{name:/Foto bareng/})).toBeVisible();await expect(page.getByRole("link",{name:/Buat Photobox/})).toHaveAttribute("href","/create")});

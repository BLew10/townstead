import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSacramento = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const orgSlug = "sacramento";

    const existing = await ctx.db
      .query("tenantBranding")
      .withIndex("by_orgSlug", (q) => q.eq("orgSlug", orgSlug))
      .unique();
    if (existing) {
      throw new Error(
        `Seed data already exists for orgSlug "${orgSlug}". Delete it first or use a different slug.`
      );
    }

    // --- Tenant Branding ---
    await ctx.db.insert("tenantBranding", {
      orgId,
      orgSlug,
      siteName: "Sacramento Community Hub",
      tagline: "Your curated guide to everything Sacramento",
      primaryColor: "#2A4B8D",
      socialLinks: {
        facebook: "https://facebook.com/sacramentohub",
        instagram: "https://instagram.com/sacramentohub",
        twitter: "https://x.com/sacramentohub",
        youtube: "https://youtube.com/@sacramentohub",
      },
      footerText: "Sacramento Community Hub is a local community platform.",
    });

    // --- Calendar Edition ---
    const calEdId = await ctx.db.insert("calendarEditions", {
      name: "Sacramento 2026",
      code: "SAC26",
      orgId,
    });

    // --- Communities ---
    const downtownId = await ctx.db.insert("communities", {
      name: "Downtown Sacramento",
      slug: "downtown",
      description:
        "The heart of California's capital — government, dining, and culture.",
      calendarEditionIds: [calEdId],
      orgId,
    });

    const midtownId = await ctx.db.insert("communities", {
      name: "Midtown Sacramento",
      slug: "midtown",
      description:
        "Eclectic arts district with walkable shops, galleries, and eateries.",
      calendarEditionIds: [calEdId],
      orgId,
    });

    // --- Categories ---
    const catFestivals = await ctx.db.insert("categories", {
      name: "Festivals & Fairs",
      type: "event",
      orgId,
    });
    const catMusic = await ctx.db.insert("categories", {
      name: "Live Music",
      type: "event",
      orgId,
    });
    const catLocalNews = await ctx.db.insert("categories", {
      name: "Local News",
      type: "blog",
      orgId,
    });
    const catFoodDrink = await ctx.db.insert("categories", {
      name: "Food & Drink",
      type: "blog",
      orgId,
    });
    const catSpotlight = await ctx.db.insert("categories", {
      name: "Business Spotlight",
      type: "video",
      orgId,
    });
    const catHowTo = await ctx.db.insert("categories", {
      name: "How-To",
      type: "video",
      orgId,
    });
    const catRestaurants = await ctx.db.insert("categories", {
      name: "Restaurants",
      type: "business",
      orgId,
    });
    const catShopping = await ctx.db.insert("categories", {
      name: "Shopping",
      type: "business",
      orgId,
    });
    const catFitness = await ctx.db.insert("categories", {
      name: "Fitness",
      type: "business",
      orgId,
    });
    const catEntertainment = await ctx.db.insert("categories", {
      name: "Arts and Entertainment - Museums",
      type: "business",
      orgId,
    });

    // --- Contacts (Businesses) ---
    const biz1 = await ctx.db.insert("contacts", {
      company: "Tower Bridge Bistro",
      firstName: "Maria",
      lastName: "Santos",
      email: "info@towerbridgebistro.com",
      phone: "(916) 555-0101",
      address: {
        street: "1100 Front St",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
      },
      website: "https://towerbridgebistro.com",
      categoryId: catRestaurants,
      slug: "tower-bridge-bistro",
      description:
        "Farm-to-fork dining with panoramic views of the Tower Bridge and the Sacramento River.",
      featured: true,
      searchText: "Tower Bridge Bistro restaurant dining farm-to-fork",
      orgId,
    });

    const biz2 = await ctx.db.insert("contacts", {
      company: "Midtown Mercantile",
      firstName: "James",
      lastName: "Chen",
      email: "hello@midtownmercantile.com",
      phone: "(916) 555-0102",
      address: {
        street: "2000 J St",
        city: "Sacramento",
        state: "CA",
        zip: "95811",
      },
      website: "https://midtownmercantile.com",
      categoryId: catShopping,
      slug: "midtown-mercantile",
      description:
        "Locally curated gifts, home goods, and artisan products from Sacramento makers.",
      featured: true,
      searchText: "Midtown Mercantile shopping gifts artisan local",
      orgId,
    });

    const biz3 = await ctx.db.insert("contacts", {
      company: "Capitol Yoga Studio",
      firstName: "Priya",
      lastName: "Sharma",
      email: "namaste@capitolyoga.com",
      phone: "(916) 555-0103",
      address: {
        street: "1500 L St",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
      },
      website: "https://capitolyoga.com",
      categoryId: catFitness,
      slug: "capitol-yoga-studio",
      description:
        "Vinyasa, hot yoga, and meditation classes in the heart of downtown.",
      featured: false,
      searchText: "Capitol Yoga Studio wellness fitness meditation",
      orgId,
    });

    const biz4 = await ctx.db.insert("contacts", {
      company: "Old Sacramento General Store",
      firstName: "Tom",
      lastName: "Baker",
      email: "shop@oldsacgeneral.com",
      phone: "(916) 555-0104",
      address: {
        street: "111 I St",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
      },
      website: "https://oldsacgeneral.com",
      categoryId: catShopping,
      slug: "old-sacramento-general-store",
      description:
        "Souvenirs, candy, and Gold Rush memorabilia in historic Old Sacramento.",
      featured: true,
      searchText: "Old Sacramento General Store souvenirs gifts Gold Rush",
      orgId,
    });

    const biz5 = await ctx.db.insert("contacts", {
      company: "River City Brewing Co.",
      firstName: "Alex",
      lastName: "Rivera",
      email: "tap@rivercitybrew.com",
      phone: "(916) 555-0105",
      address: {
        street: "545 Downtown Plaza",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
      },
      website: "https://rivercitybrew.com",
      categoryId: catRestaurants,
      slug: "river-city-brewing",
      description:
        "Craft beer brewed on-site with a rotating seasonal menu and live music Fridays.",
      featured: true,
      searchText: "River City Brewing craft beer brewery restaurant",
      orgId,
    });

    const biz6 = await ctx.db.insert("contacts", {
      company: "Crocker Art Gallery",
      firstName: "Sandra",
      lastName: "Lee",
      email: "visit@crockerart.org",
      phone: "(916) 555-0106",
      address: {
        street: "216 O St",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
      },
      website: "https://crockerart.org",
      categoryId: catEntertainment,
      slug: "crocker-art-gallery",
      description:
        "The oldest public art museum west of the Mississippi, featuring California and international art.",
      featured: false,
      searchText: "Crocker Art Gallery museum art culture entertainment",
      orgId,
    });

    // --- Events (future dates) ---
    const now = Date.now();
    const day = 86400000;

    await ctx.db.insert("events", {
      name: "Second Saturday Art Walk",
      description:
        "Explore Midtown galleries, pop-up shops, and live music on Sacramento's beloved Second Saturday.",
      date: now + 10 * day,
      startTime: "5:00 PM",
      endTime: "9:00 PM",
      location: "Midtown Sacramento, J Street Corridor",
      categoryId: catFestivals,
      communityIds: [midtownId],
      isApproved: true,
      orgId,
    });

    await ctx.db.insert("events", {
      name: "Farm-to-Fork Festival",
      description:
        "Sacramento's signature culinary celebration on the Capitol Mall, featuring local chefs, farmers, and artisan food vendors.",
      date: now + 20 * day,
      startTime: "11:00 AM",
      endTime: "10:00 PM",
      location: "Capitol Mall, Sacramento",
      categoryId: catFestivals,
      communityIds: [downtownId, midtownId],
      isApproved: true,
      orgId,
    });

    await ctx.db.insert("events", {
      name: "Jazz on the River",
      description:
        "Smooth jazz performances along the Sacramento River waterfront with food trucks and craft cocktails.",
      date: now + 14 * day,
      startTime: "6:00 PM",
      endTime: "10:00 PM",
      location: "River Walk Park, West Sacramento",
      categoryId: catMusic,
      communityIds: [downtownId],
      isApproved: true,
      orgId,
    });

    await ctx.db.insert("events", {
      name: "Midtown Farmers Market",
      description:
        "Weekly farmers market with fresh produce, flowers, baked goods, and live acoustic music.",
      date: now + 3 * day,
      startTime: "8:00 AM",
      endTime: "1:00 PM",
      location: "20th & J Streets, Midtown",
      categoryId: catFestivals,
      communityIds: [midtownId],
      isApproved: true,
      orgId,
    });

    await ctx.db.insert("events", {
      name: "Capitol Park Sunset Concert",
      description:
        "Free outdoor concert series in Capitol Park featuring local and regional bands.",
      date: now + 7 * day,
      startTime: "7:00 PM",
      endTime: "9:30 PM",
      location: "Capitol Park, Downtown Sacramento",
      categoryId: catMusic,
      communityIds: [downtownId],
      isApproved: true,
      orgId,
    });

    await ctx.db.insert("events", {
      name: "Sacramento Mural Festival",
      description:
        "Watch muralists transform Midtown buildings into public art during this weekend-long festival.",
      date: now + 30 * day,
      endDate: now + 32 * day,
      startTime: "10:00 AM",
      endTime: "6:00 PM",
      location: "Wide Open Walls, Midtown Sacramento",
      categoryId: catFestivals,
      communityIds: [midtownId],
      isApproved: true,
      orgId,
    });

    await ctx.db.insert("events", {
      name: "Old Sac Ghost Tour",
      description:
        "Guided walking tour through the haunted alleys and underground tunnels of Old Sacramento.",
      date: now + 12 * day,
      startTime: "8:00 PM",
      endTime: "10:00 PM",
      location: "Old Sacramento Waterfront",
      categoryId: catFestivals,
      communityIds: [downtownId],
      isApproved: true,
      orgId,
    });

    await ctx.db.insert("events", {
      name: "River Cats Baseball Night",
      description:
        "Catch the Sacramento River Cats play under the lights with fireworks after the game.",
      date: now + 5 * day,
      startTime: "7:05 PM",
      endTime: "10:00 PM",
      location: "Sutter Health Park",
      categoryId: catFestivals,
      communityIds: [downtownId, midtownId],
      isApproved: true,
      orgId,
    });

    // --- Coupons ---
    await ctx.db.insert("coupons", {
      businessContactId: biz1,
      title: "20% Off Farm-to-Fork Dinner",
      description:
        "Enjoy 20% off any dinner entree at Tower Bridge Bistro. Valid for dine-in only.",
      startDate: now,
      endDate: now + 60 * day,
      quantityLimit: 100,
      terms: "One per customer. Cannot be combined with other offers. Dine-in only.",
      communityIds: [downtownId],
      orgId,
    });

    await ctx.db.insert("coupons", {
      businessContactId: biz2,
      title: "Buy 2, Get 1 Free Candles",
      description:
        "Purchase any two artisan candles and get the third free at Midtown Mercantile.",
      startDate: now,
      endDate: now + 45 * day,
      quantityLimit: 50,
      terms: "Free item must be of equal or lesser value. In-store only.",
      communityIds: [midtownId],
      orgId,
    });

    await ctx.db.insert("coupons", {
      businessContactId: biz3,
      title: "Free First Class",
      description:
        "Your first yoga class is completely free at Capitol Yoga Studio. All levels welcome.",
      startDate: now,
      endDate: now + 90 * day,
      terms: "New members only. Must register online.",
      communityIds: [downtownId],
      orgId,
    });

    await ctx.db.insert("coupons", {
      businessContactId: biz5,
      title: "Happy Hour BOGO Pints",
      description:
        "Buy one get one free on all draft pints during happy hour at River City Brewing.",
      startDate: now,
      endDate: now + 30 * day,
      quantityLimit: 200,
      terms: "Valid Mon-Thu, 4-6 PM. Must be 21+.",
      communityIds: [downtownId, midtownId],
      orgId,
    });

    await ctx.db.insert("coupons", {
      businessContactId: biz4,
      title: "10% Off Gold Rush Souvenirs",
      description:
        "Save 10% on any Gold Rush-themed merchandise at Old Sacramento General Store.",
      startDate: now,
      endDate: now + 60 * day,
      quantityLimit: 75,
      terms: "Excludes sale items. In-store only.",
      communityIds: [downtownId],
      orgId,
    });

    // --- Blog Posts ---
    await ctx.db.insert("blogPosts", {
      title: "Top 10 Farm-to-Fork Restaurants in Sacramento",
      slug: "top-10-farm-to-fork-restaurants",
      content: `<h2>Sacramento: America's Farm-to-Fork Capital</h2>
<p>Sacramento has earned its reputation as the nation's farm-to-fork capital, and for good reason. Surrounded by some of the most fertile farmland in the world, our local restaurants have access to ingredients that most cities can only dream of.</p>
<h3>1. Tower Bridge Bistro</h3>
<p>With its panoramic views of the iconic Tower Bridge, this downtown gem sources 90% of its ingredients from within a 50-mile radius. The seasonal tasting menu is a must-try for any food lover.</p>
<h3>2. The Kitchen Restaurant</h3>
<p>This interactive dining experience puts you right in the kitchen with the chef. Every dish tells a story of local agriculture and culinary innovation.</p>
<h3>3. Mulvaney's B&L</h3>
<p>Set in a restored 1893 firehouse, Mulvaney's has been a pioneer of the farm-to-fork movement since before it had a name. Chef Patrick Mulvaney's relationships with local farmers are legendary.</p>
<p>From casual brunch spots to fine dining experiences, Sacramento's restaurant scene continues to evolve and surprise. Whether you're a longtime resident or just visiting, these restaurants showcase the very best of what our region has to offer.</p>`,
      excerpt:
        "Discover the best farm-to-fork dining experiences in America's Farm-to-Fork Capital.",
      status: "published",
      publishedAt: now - 2 * day,
      categoryIds: [catFoodDrink],
      communityIds: [downtownId, midtownId],
      seoTitle: "Top 10 Farm-to-Fork Restaurants in Sacramento | Sacramento Community Hub",
      seoDescription:
        "Explore the best farm-to-fork restaurants in Sacramento, from Tower Bridge Bistro to The Kitchen.",
      orgId,
    });

    await ctx.db.insert("blogPosts", {
      title: "Second Saturday: A Guide to Midtown's Monthly Art Walk",
      slug: "second-saturday-art-walk-guide",
      content: `<h2>What is Second Saturday?</h2>
<p>Every second Saturday of the month, Midtown Sacramento transforms into an open-air gallery. Dozens of galleries, studios, and boutiques along the J Street corridor throw open their doors for an evening of art, music, and community.</p>
<h3>Getting There</h3>
<p>The art walk stretches from 18th to 28th streets along J Street, with satellite venues on nearby blocks. Street parking is free after 6 PM, or take the light rail to the 23rd Street station.</p>
<h3>What to Expect</h3>
<p>Each gallery offers complimentary refreshments, and you'll find live musicians performing on sidewalks and in courtyards. Many local restaurants offer Second Saturday specials, so plan to make a night of it.</p>
<p>Whether you're an art collector or just curious, Second Saturday is Sacramento at its most creative and welcoming.</p>`,
      excerpt:
        "Everything you need to know about Sacramento's beloved monthly art walk in Midtown.",
      status: "published",
      publishedAt: now - 5 * day,
      categoryIds: [catLocalNews],
      communityIds: [midtownId],
      orgId,
    });

    await ctx.db.insert("blogPosts", {
      title: "Summer on the Sacramento River: Activities and Events",
      slug: "summer-sacramento-river-guide",
      content: `<h2>Make the Most of River Season</h2>
<p>As temperatures climb, the Sacramento and American Rivers become the social hub of the city. From kayaking to riverside dining, here's your guide to summer on the water.</p>
<h3>Kayaking and Paddleboarding</h3>
<p>Several outfitters near the confluence offer hourly rentals. The calm stretch between Discovery Park and Old Sacramento is perfect for beginners.</p>
<h3>Riverside Dining</h3>
<p>Tower Bridge Bistro and several waterfront restaurants offer patio seating with views of the river. Sunset dinners are particularly magical during the long summer evenings.</p>
<h3>River Cats Games</h3>
<p>Sutter Health Park sits right on the riverfront. Catch a Sacramento River Cats baseball game and enjoy fireworks on select Friday nights.</p>`,
      excerpt:
        "Your essential guide to summer activities along the Sacramento River.",
      status: "published",
      publishedAt: now - 1 * day,
      categoryIds: [catLocalNews],
      communityIds: [downtownId],
      orgId,
    });

    await ctx.db.insert("blogPosts", {
      title: "The Best Coffee Shops for Remote Work in Sacramento",
      slug: "best-coffee-shops-remote-work",
      content: `<h2>Fuel Your Workday</h2>
<p>Sacramento's coffee scene has exploded in recent years, and many of our favorite roasters double as excellent co-working spaces. Here are our picks for the best cafes to set up your laptop.</p>
<h3>Temple Coffee Roasters</h3>
<p>Multiple locations across Midtown and Downtown. Fast Wi-Fi, ample seating, and some of the best single-origin pour-overs in the city.</p>
<h3>Insight Coffee Roasters</h3>
<p>Their R Street location features a spacious upstairs loft that's practically designed for getting work done.</p>
<h3>Identity Coffees</h3>
<p>A newer addition to the Midtown scene with a minimalist aesthetic and excellent espresso drinks.</p>`,
      excerpt:
        "Find the perfect cafe to work from with great Wi-Fi and even better coffee.",
      status: "published",
      publishedAt: now - 3 * day,
      categoryIds: [catFoodDrink],
      communityIds: [midtownId],
      orgId,
    });

    // --- Videos ---
    await ctx.db.insert("videos", {
      title: "Inside Tower Bridge Bistro: A Chef's Story",
      description:
        "Go behind the scenes with Chef Maria Santos as she creates a seasonal farm-to-fork menu.",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      businessContactId: biz1,
      categoryId: catSpotlight,
      communityIds: [downtownId],
      orgId,
    });

    await ctx.db.insert("videos", {
      title: "Midtown Mercantile: Supporting Local Artisans",
      description:
        "Meet the makers behind the handcrafted goods at Midtown Mercantile.",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      businessContactId: biz2,
      categoryId: catSpotlight,
      communityIds: [midtownId],
      orgId,
    });

    await ctx.db.insert("videos", {
      title: "How to Brew the Perfect Pour-Over at Home",
      description:
        "Learn the art of pour-over coffee with tips from Sacramento's top baristas.",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      categoryId: catHowTo,
      communityIds: [downtownId, midtownId],
      orgId,
    });

    await ctx.db.insert("videos", {
      title: "A Walking Tour of Old Sacramento",
      description:
        "Discover the Gold Rush history and hidden gems of Old Sacramento's waterfront district.",
      url: "https://vimeo.com/148751763",
      categoryId: catHowTo,
      communityIds: [downtownId],
      orgId,
    });

    return { success: true, orgSlug };
  },
});

const BUSINESS_CATEGORIES = [
  "Accountants",
  "Ad Agencies",
  "Appliance, Repair",
  "Appliance, Retail",
  "Arts and Crafts",
  "Arts and Entertainment - Bands, Concerts",
  "Arts and Entertainment - Banquet Halls, Venues, Event Centers",
  "Arts and Entertainment - Batting Cages, Go-Karts, Mini Golf",
  "Arts and Entertainment - Casinos",
  "Arts and Entertainment - Festivals, Fairs, Galas",
  "Arts and Entertainment - Fireworks",
  "Arts and Entertainment - Fun Centers, Trampoline Parks, Escape Rooms",
  "Arts and Entertainment - Movies, Theaters",
  "Arts and Entertainment - Museums",
  "Arts and Entertainment - Other",
  "Arts and Entertainment - Parks, Recreation",
  "Attorneys, Lawyers",
  "Bagels",
  "Bakeries, Donuts",
  "Banks, Credit Unions",
  "Batteries",
  "Beer, Liquor, Wine",
  "Bicycles",
  "Bookstores, Comics",
  "Bowling",
  "Business to Business",
  "Car, Truck, and Auto - Body",
  "Car, Truck, and Auto - Dealers",
  "Car, Truck, and Auto - Gas, Marts, Stations",
  "Car, Truck, and Auto - Oil Change",
  "Car, Truck, and Auto - Other",
  "Car, Truck, and Auto - Rentals",
  "Car, Truck, and Auto - Repair",
  "Car, Truck, and Auto - Supplies, Parts",
  "Car, Truck, and Auto - Tires",
  "Car, Truck, and Auto - Towing",
  "Car, Truck, and Auto - Transmissions",
  "Car, Truck, and Auto - Used Cars",
  "Car, Truck, and Auto - Used Parts, Salvage Yards",
  "Car, Truck, and Auto - Wash",
  "Carpet Cleaning, Restoration",
  "Cellular, Accessories, Pagers, Service, Stores",
  "Cemeteries, Cremation",
  "Chambers of Commerce",
  "Charities, Nonprofit",
  "Childcare, Daycare",
  "Clothing - Clothes, Fashion",
  "Clothing - Embroidery",
  "Clothing - Tailors, Seamstresses",
  "Community and Government",
  "Computers",
  "Construction, Builders, Architects",
  "Consumers",
  "Dance, Gymnastics",
  "Dentists, Orthodontists",
  "Dry Cleaners",
  "Education - Colleges and Universities, Adult",
  "Education - Preschool, K-12",
  "Electricians",
  "Electronics",
  "Financial, Investments",
  "Firearms, Fishing, Ammo",
  "Fitness",
  "Florists",
  "Food, Restaurants - Asian",
  "Food, Restaurants - Barbecue",
  "Food, Restaurants - Bars, Grills",
  "Food, Restaurants - Buffet",
  "Food, Restaurants - Cafe",
  "Food, Restaurants - Catering",
  "Food, Restaurants - Coffee",
  "Food, Restaurants - Deli",
  "Food, Restaurants - Family, Dining",
  "Food, Restaurants - Fast",
  "Food, Restaurants - French",
  "Food, Restaurants - Indian",
  "Food, Restaurants - Juicers, Smoothies",
  "Food, Restaurants - Mexican",
  "Food, Restaurants - Other",
  "Food, Restaurants - Pizza, Italian",
  "Food, Restaurants - Seafood",
  "Food, Restaurants - Steak House",
  "Food, Restaurants - Sushi",
  "Food, Restaurants - Thai",
  "Framing",
  "Funeral Homes",
  "Furniture, Stores",
  "Furniture, Upholstery",
  "Gifts, Card Shops, Party Supplies",
  "Golf",
  "Grocers, Grocery, Markets",
  "Hair, Skin, Nails",
  "Hardware",
  "Health - Food Stores",
  "Health - Other",
  "Health - Supplements",
  "Heating and Cooling",
  "Hobby Stores, Toy Stores",
  "Home Improvement - Bathrooms",
  "Home Improvement - Carpet, Flooring",
  "Home Improvement - Chimneys",
  "Home Improvement - Decks, Patios",
  "Home Improvement - Doors, Windows",
  "Home Improvement - Driveways",
  "Home Improvement - Fencing",
  "Home Improvement - Kitchens",
  "Home Improvement - Other",
  "Home Improvement - Remodel, Painters",
  "Home Improvement - Roofing",
  "Home Improvement - Siding",
  "Hotels",
  "Housewares",
  "Ice Cream, Candy, Yogurt",
  "Independent Sales Consultants",
  "Insurance",
  "Interiors - Blinds",
  "Interiors - Carpet, Flooring",
  "Interiors - Lighting, Fixtures",
  "Interiors - Wallpaper",
  "Internet, Networking, Service",
  "Jewelers",
  "Jobs, Job Openings",
  "Landscaping, Lawn, Tree Service",
  "Lawn, Garden Centers, Nurseries",
  "Lawn, Mowers, Shops",
  "Libraries",
  "Lighting Fixtures",
  "Limo, Taxi Service, Public Transportation",
  "Locksmiths",
  "Maid Service, House Cleaning, Window Cleaning",
  "Marine, Boats, Service",
  "Martial Arts",
  "Medical, Physicians and Doctors - Anesthesiologists",
  "Medical, Physicians and Doctors - Audiologists, Hearing",
  "Medical, Physicians and Doctors - Cardiologists",
  "Medical, Physicians and Doctors - Chiropractors",
  "Medical, Physicians and Doctors - Dermatologists",
  "Medical, Physicians and Doctors - Ear, Nose, Throat",
  "Medical, Physicians and Doctors - Family Medicine",
  "Medical, Physicians and Doctors - Health Services",
  "Medical, Physicians and Doctors - Home Health Care",
  "Medical, Physicians and Doctors - Hospital, Health Centers, Urgent Care",
  "Medical, Physicians and Doctors - Internal Medicine",
  "Medical, Physicians and Doctors - Massage Clinics, Therapists, Spas",
  "Medical, Physicians and Doctors - Mental Health, Counseling, Psychologists",
  "Medical, Physicians and Doctors - OBGYN",
  "Medical, Physicians and Doctors - Oncologists",
  "Medical, Physicians and Doctors - Ophthalmologists",
  "Medical, Physicians and Doctors - Orthopedics",
  "Medical, Physicians and Doctors - Other",
  "Medical, Physicians and Doctors - Pediatricians",
  "Medical, Physicians and Doctors - Podiatrists",
  "Medical, Physicians and Doctors - Sports Medicine",
  "Mortgages, Loans",
  "Music, Lessons",
  "Music, Stores",
  "Newspapers, Radio, Television Stations",
  "Nursing Homes/Hospice",
  "Optical, Optometrist",
  "Packaging, Shipping",
  "Personal Care Services",
  "Pest Control",
  "Pets - Boarding, Day Care",
  "Pets - Feed, Products",
  "Pets - Other",
  "Pets - Services, Grooming",
  "Pets - Shops",
  "Pets - Veterinarians",
  "Pharmacies",
  "Photography, Processing, Cameras",
  "Plumbing",
  "Political",
  "Pools",
  "Powersports, Motorcycles, Scooters, Utes",
  "Propane, Propane Refills, Accessories",
  "Real Estate - Agents",
  "Real Estate - Apartments, Condos",
  "Real Estate - Commercial",
  "Real Estate - Inspection",
  "Real Estate - Mobile Homes",
  "Real Estate - Movers",
  "Real Estate - Other",
  "Real Estate - Property Management",
  "Religious - Churches, Synagogues, Mosques",
  "Rentals, Equipment, Tools",
  "Resale, Pawn Shops, Consignment",
  "Retirement Homes, Assisted Living",
  "Security, Home Automation",
  "Senior Citizen Services",
  "Septic, Sewers",
  "Shoes",
  "Shopping - Children's Stores",
  "Shopping - Department Stores, Retail Stores",
  "Shopping - Other",
  "Shopping - Shopping Centers, Malls",
  "Shopping - Wedding, Bridal",
  "Sporting Goods",
  "Sports Teams, Clubs",
  "Storage",
  "Tanning",
  "Television - Cable",
  "Television - Sales, Repair",
  "Tobacco, CBD",
  "Tourism, Travel - Agents",
  "Tourism, Travel - Airlines, Airports",
  "Tourism, Travel - Cruises",
  "Tourism, Travel - Historical Places",
  "Tourism, Travel - Other",
  "Tourism, Travel - Resorts, Spas",
  "Tourism, Travel - Vacation Rentals",
  "Tourism, Travel - Wineries, Vineyards",
  "Town Planner Publisher",
  "Unclassified, Miscellaneous",
  "Utilities",
  "Video Rental",
  "Waste Management - Other",
  "Waste Management - Recycling",
  "Waste Management - Trash",
  "Water Treatment, Softeners, Systems",
  "Weight Loss",
];

export const seedBusinessCategories = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_orgId_and_type", (q) =>
        q.eq("orgId", orgId).eq("type", "business")
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const existingNames = new Set(existing.map((c) => c.name));
    let inserted = 0;

    for (const name of BUSINESS_CATEGORIES) {
      if (existingNames.has(name)) continue;
      await ctx.db.insert("categories", {
        name,
        type: "business",
        orgId,
        isDeleted: false,
      });
      inserted++;
    }

    return {
      inserted,
      skipped: BUSINESS_CATEGORIES.length - inserted,
      total: BUSINESS_CATEGORIES.length,
    };
  },
});

// v1 numeric code → category name mapping (the v1 app stored codes like "78")
const V1_CODE_TO_NAME: Record<string, string> = {};
BUSINESS_CATEGORIES.forEach((name, idx) => {
  V1_CODE_TO_NAME[String(idx + 1)] = name;
});

/**
 * Backfill: maps existing contacts' `category` (string) to `categoryId` (FK),
 * then clears the legacy `category` field. Handles both v1 numeric codes
 * (e.g. "78") and plain name strings (e.g. "Restaurants"). Safe to run
 * multiple times.
 */
export const backfillContactCategories = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_orgId_and_type", (q) =>
        q.eq("orgId", orgId).eq("type", "business")
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const nameToId = new Map(categories.map((c) => [c.name, c._id]));

    // Process ALL contacts (including soft-deleted) to clean up legacy field
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();

    // Custom aliases for non-standard v1 names
    const aliases: Record<string, string> = {
      "Health & Wellness": "Fitness",
      "Entertainment": "Arts and Entertainment - Other",
      "Restaurants": "Food, Restaurants - Other",
    };

    let mapped = 0;
    let cleared = 0;
    let unmatched = 0;
    const unmatchedValues: string[] = [];

    for (const contact of contacts) {
      if (!contact.category) continue;

      if (contact.categoryId) {
        await ctx.db.patch(contact._id, { category: undefined });
        cleared++;
        continue;
      }

      // Try direct name match, then v1 numeric code, then aliases
      const resolvedName =
        nameToId.has(contact.category)
          ? contact.category
          : V1_CODE_TO_NAME[contact.category] ??
            aliases[contact.category];

      const categoryId = resolvedName ? nameToId.get(resolvedName) : undefined;

      if (categoryId) {
        await ctx.db.patch(contact._id, { categoryId, category: undefined });
        mapped++;
      } else if (contact.category === "0") {
        // "0" = "Please select" (no category) — just clear it
        await ctx.db.patch(contact._id, { category: undefined });
        cleared++;
      } else {
        if (!unmatchedValues.includes(contact.category)) {
          unmatchedValues.push(contact.category);
        }
        unmatched++;
      }
    }

    return { mapped, cleared, unmatched, unmatchedValues };
  },
});

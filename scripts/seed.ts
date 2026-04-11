import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USERS = [
  { username: "levan.mamulashvili", name: "Levan Mamulashvili", bio: "📸 Photographer | Tbilisi\n🇬🇪 Capturing Georgia's soul", verified: true },
  { username: "nino_tbilisi", name: "ნინო ჭელიძე", bio: "ფოტოგრაფი | თბილისი ❤️\n📸 Life through the lens" },
  { username: "giorgi_photo", name: "გიორგი ფხაკაძე", bio: "🌿 Travel & Nature\n📍 Georgia & Beyond" },
  { username: "mariam_style", name: "მარიამ კვარაცხელია", bio: "✨ Fashion & Lifestyle\n👗 collab: mariam@style.ge", verified: true },
  { username: "david_geo", name: "დავით გელაშვილი", bio: "📷 Street Photographer\n🏛️ Tbilisi Architecture" },
  { username: "ana_creative", name: "ანა ბერიძე", bio: "🎨 Art Director\n🖌️ Making things beautiful" },
  { username: "luka_vibes", name: "ლუკა მელიქიძე", bio: "🎵 Music Producer\n🎧 beats & vibes" },
  { username: "tamar_eats", name: "თამარ ჯაფარიძე", bio: "🍽️ Food Blogger\n🧑‍🍳 Georgian cuisine lover" },
  { username: "irakli_fit", name: "ირაკლი ბახტაძე", bio: "💪 Fitness Coach\n🏋️ Transform your body" },
  { username: "salome_art", name: "სალომე ხვედელიძე", bio: "🖌️ Artist & Designer\n🎭 Gallery owner" },
  { username: "beka_travel", name: "ბექა ნიჟარაძე", bio: "🏔️ Adventure Seeker\n🌍 50+ countries" },
  { username: "keti_fashion", name: "კეთი ლომიძე", bio: "👗 Fashion Stylist\n✨ Wardrobe transformations" },
  { username: "nika_tech", name: "ნიკა გვარამია", bio: "💻 Full Stack Dev\n🚀 Building the future" },
  { username: "maka_cook", name: "მაკა ანდღულაძე", bio: "🧑‍🍳 Georgian Chef\n📖 Cookbook author" },
  { username: "sandro_music", name: "სანდრო ბიწაძე", bio: "🎸 Guitarist\n🎵 Live music every weekend" },
  { username: "lali_nature", name: "ლალი ცქვიტინიძე", bio: "🌄 Nature & Landscape\n🌿 Environmental activist" },
  { username: "giorgi_tbilisi", name: "გიორგი ჭელიძე", bio: "🏙️ Urban Explorer\n📷 Street & Architecture" },
  { username: "nata_beauty", name: "ნატა მიქელაძე", bio: "💄 MUA & Beauty Creator\n✨ Tutorials & Reviews" },
  { username: "zuka_sport", name: "ზუკა კვირკველია", bio: "⚽ Football Coach\n🏃 Sports & Fitness" },
  { username: "mari_design", name: "მარი ასათიანი", bio: "🎨 UX/UI Designer\n💻 Digital nomad", verified: true },
  { username: "sophie_geo", name: "სოფიო გოგიაშვილი", bio: "🌸 Lifestyle blogger\n☕ Coffee addict\n📍 Tbilisi" },
  { username: "tornike_dev", name: "თორნიკე ჩხენკელი", bio: "👨‍💻 iOS Developer\n🍎 Apple ecosystem enthusiast" },
  { username: "elene_photo", name: "ელენე ბურჭულაძე", bio: "📸 Wedding Photographer\n💍 Capturing love stories" },
  { username: "giorgi_chef", name: "გიორგი ქიქოძე", bio: "👨‍🍳 Executive Chef\n🍷 Wine & Dine\n🏆 Best Restaurant 2023" },
  { username: "natia_yoga", name: "ნათია ლომთათიძე", bio: "🧘 Yoga Instructor\n🌿 Mindfulness & Wellness" },
  { username: "davit_mountain", name: "დავით კვირიკაშვილი", bio: "🏔️ Alpinist\n⛰️ Caucasus mountains explorer" },
  { username: "tamuna_art", name: "თამუნა გელოვანი", bio: "🎭 Theater actress\n🎬 Filmmaker\n✨ Tbilisi Film Festival" },
  { username: "ioane_music", name: "იოანე ჩხეიძე", bio: "🎹 Pianist & Composer\n🎼 Classical meets jazz" },
  { username: "nino_fashion", name: "ნინო ქარჩავა", bio: "👠 Luxury Fashion\n✈️ Milan, Paris, Tbilisi\n🛍️ Personal shopper", verified: true },
  { username: "lasha_photo", name: "ლაშა მჭედლიძე", bio: "📷 Documentary photographer\n🌍 NGO work\n🇬🇪" },
  { username: "ana_wellness", name: "ანა სიხარულიძე", bio: "🌺 Holistic health coach\n🍃 Plant-based living" },
  { username: "giorgi_wine", name: "გიორგი ხვედელიძე", bio: "🍷 Winemaker\n🏡 Kakheti family vineyard\n🍇 Natural wine" },
  { username: "marine_travel", name: "მარინე ვაჩნაძე", bio: "✈️ Travel writer\n📖 Author of 'Georgia Unknown'\n🌍 35 countries" },
  { username: "nika_fitness", name: "ნიკა ბუჭუხური", bio: "🏋️ CrossFit coach\n💪 Nutrition specialist\n🔥 Transform your life" },
  { username: "teo_design", name: "თეო ჩიჩუა", bio: "🎨 Graphic designer\n✏️ Brand identity specialist\n💼 Freelance" },
  { username: "beso_street", name: "ბესო ჩხატარაშვილი", bio: "📸 Street photography\n🏙️ Documenting city life\n📍 Tbilisi" },
  { username: "ia_cooking", name: "ია ხვედელიძე", bio: "🍽️ Traditional Georgian recipes\n👵 Grandma's kitchen secrets" },
  { username: "levan_sport", name: "ლევან ხეჩიკაშვილი", bio: "🏊 Swimming champion\n🏅 Olympic finalist\n💙 Georgian Swimming Federation" },
  { username: "nino_makeup", name: "ნინო ხვედელიძე", bio: "💋 Celebrity MUA\n🎬 Film & TV makeup\n✨ Wedding specialist" },
  { username: "dato_guitar", name: "დათო ფარულავა", bio: "🎸 Session guitarist\n🎵 Rock & Jazz\n🎤 Vocalist" },
  { username: "khatia_dance", name: "ხათია ბახტაძე", bio: "💃 Georgian national dancer\n🎭 Choreographer\n🌟 Sukhishvili Company" },
  { username: "giorgi_cars", name: "გიორგი ხაჩიძე", bio: "🚗 Automotive enthusiast\n🏎️ Track day events\n🔧 Custom builds" },
  { username: "nana_flowers", name: "ნანა ჯავახიშვილი", bio: "🌸 Floral designer\n💐 Wedding & events\n🌺 Tbilisi Flower Market" },
  { username: "tako_travel", name: "თაქო ბეჟიტაშვილი", bio: "🌍 Solo female traveler\n📝 Travel blogger\n✈️ 40 countries solo" },
  { username: "archil_tech", name: "არჩილ ქოჩლაძე", bio: "🤖 AI Engineer\n🧠 Machine Learning\n🚀 Startup founder" },
  { username: "manana_books", name: "მანანა ჩხიკვაძე", bio: "📚 Literature professor\n✍️ Author\n🎭 Tbilisi Book Festival curator" },
  { username: "vano_adventure", name: "ვანო ლომიძე", bio: "🧗 Rock climber\n🏕️ Wild camping\n🌲 Outdoor guide" },
  { username: "salome_coffee", name: "სალომე ბიჭიაშვილი", bio: "☕ Coffee roaster\n🌿 Specialty coffee\n📍 Fabrika Coffee" },
  { username: "gio_architect", name: "გიო ჯიქია", bio: "🏗️ Architect\n🏛️ Restoring old Tbilisi\n🇬🇪 Heritage preservation" },
  { username: "lika_kids", name: "ლიკა გოგიაშვილი", bio: "👶 Mom of 3\n🎨 Kids activities blogger\n❤️ Family first" },
];

const CAPTIONS = [
  "თბილისის საღამო ✨ ეს ქალაქი ყოველ ჯერზე სხვა სახეს გვიჩვენებს 🌆 #თბილისი #tbilisi #georgia",
  "კახეთის ვენახებში 🍇 ქართული ღვინო - მსოფლიოს საუკეთესო! #კახეთი #wine #georgian_wine",
  "გუდაური ❄️ ამ ზამთარს ეს ადგილი მაგიური იყო #gudauri #ski #winter #georgia",
  "ქართული სამზარეულო 🥘 ხინკალი + ღვინო = სრული ბედნიერება #georgian_food #khinkali",
  "სიგნაღი - სიყვარულის ქალაქი 💕 perfect weekend getaway #signagi #love #weekend",
  "ბათუმი 🌊 ზღვა, პალმები, Adjarian vibe #batumi #sea #summer #adjara",
  "მცხეთა 🕌 Georgia's spiritual heart #mtskheta #georgia #heritage",
  "ყაზბეგი 🏔️ Gergeti Trinity Church at golden hour #kazbegi #mountains #georgia",
  "ძველი თბილისი 🏛️ Every corner tells a story #oldtbilisi #architecture #tbilisi",
  "ქართული ღვინო 🍷 Rkatsiteli from my family's vineyard #wine #family #tradition",
  "სვანეთი 🗼 Svan towers reaching the sky #svaneti #caucasus #heritage",
  "ვარძია ⛪ This monastery carved into the mountain #vardzia #history #georgia",
  "Golden hour in Tbilisi never disappoints 🌅 #goldenhour #tbilisi #photography",
  "weekend mood ☕ ყავა + კარგი წიგნი = სრულყოფილი დილა #coffeelover #morning",
  "Georgian hospitality 🤝 ქართული სტუმართმოყვარეობა #georgia #hospitality",
  "Narikala fortress views 🏰 this city never gets old #narikala #tbilisi",
  "Nature therapy 🌿 Georgia's landscapes are breathtaking #nature #georgia #explore",
  "Local market finds 🌶️ ფერი, არომატი, სიცოცხლე! #market #tbilisi #local",
  "Late night Tbilisi 🌙 the city that never sleeps #nightlife #tbilisi #vibes",
  "Morning run along Mtkvari river 🏃 best way to start the day #running #tbilisi",
  "ბაკურიანი ⛷️ first snow of the season! #bakuriani #ski #winter",
  "Rioni gorge 🏞️ one of Georgia's best kept secrets #rioni #nature #hiking",
  "Fabrika market Sunday vibes 🎨 #fabrika #tbilisi #creative #market",
  "Georgian polyphony live 🎶 this gave me chills #music #georgia #culture",
  "Borjomi water straight from the spring 💧 #borjomi #nature #health",
  "Uplistsikhe cave city 🗿 3000 years of history #uplistsikhe #archaeology",
  "Martvili canyons 🛶 hidden gem of western Georgia #martvili #canyon",
  "Homemade churchkhela 🍇 grandmother's recipe #churchkhela #georgia #traditional",
  "Tbilisi rooftop views 🌃 can't get enough of this city #tbilisi #rooftop",
  "Prometheus cave illuminated 💎 nature's own artwork #prometheus #cave #georgia",
  "Sunset at Turtle Lake 🌅 #tbilisi #turtlelake #sunset #cityview",
  "Fresh herbs from the garden 🌿 #organic #farm #georgia #fresh",
  "Street art in Vera 🎨 Tbilisi's creative soul #streetart #tbilisi #vera",
  "Coffee culture in Georgia ☕ we take it seriously #coffee #tbilisi #specialty",
  "Kintsvisri monastery 🕌 hidden beauty of Shida Kartli #kintsvisri #orthodox",
  "Kobuleti beach 🏖️ Black Sea summer vibes #kobuleti #beach #summer",
  "Caucasus spring wildflowers 🌸 #spring #caucasus #nature #flowers",
  "Georgian wrestling - Chidaoba 🤼 national sport #chidaoba #georgia #culture",
  "Tusheti on horseback 🐎 most remote region of Georgia #tusheti #adventure",
  "Night view from Narikala 🌉 #tbilisi #night #narikala #view",
];

const LOCATIONS = [
  "თბილისი, საქართველო", "ბათუმი, აჭარა", "კახეთი, საქართველო",
  "გუდაური, საქართველო", "სიგნაღი, კახეთი", "მცხეთა", "ყაზბეგი",
  "ქუთაისი, იმერეთი", "სვანეთი", "ვარძია", "ბაკურიანი", "ანანური",
  "ბორჯომი", "ამბროლაური, რაჭა", "მარტვილი", "მესტია", "ახალციხე",
];

const IMAGES = [
  ["https://picsum.photos/seed/tb1/900/900"],
  ["https://picsum.photos/seed/geo2/900/900", "https://picsum.photos/seed/geo3/900/900"],
  ["https://picsum.photos/seed/food1/900/900", "https://picsum.photos/seed/food2/900/900", "https://picsum.photos/seed/food3/900/900"],
  ["https://picsum.photos/seed/nat1/900/900"],
  ["https://picsum.photos/seed/city1/900/900", "https://picsum.photos/seed/city2/900/900"],
  ["https://picsum.photos/seed/fash1/900/900"],
  ["https://picsum.photos/seed/mts1/900/900", "https://picsum.photos/seed/mts2/900/900"],
  ["https://picsum.photos/seed/wine1/900/900"],
  ["https://picsum.photos/seed/arch1/900/900", "https://picsum.photos/seed/arch2/900/900"],
  ["https://picsum.photos/seed/sea1/900/900"],
  ["https://picsum.photos/seed/hist1/900/900"],
  ["https://picsum.photos/seed/art1/900/900", "https://picsum.photos/seed/art2/900/900"],
  ["https://picsum.photos/seed/port1/900/900"],
  ["https://picsum.photos/seed/coff1/900/900"],
  ["https://picsum.photos/seed/mkt1/900/900", "https://picsum.photos/seed/mkt2/900/900"],
  ["https://picsum.photos/seed/ngt1/900/900"],
  ["https://picsum.photos/seed/run1/900/900"],
  ["https://picsum.photos/seed/mntn1/900/900", "https://picsum.photos/seed/mntn2/900/900"],
  ["https://picsum.photos/seed/grp1/900/900"],
  ["https://picsum.photos/seed/strt1/900/900"],
  ["https://picsum.photos/seed/tbx1/900/900"],
  ["https://picsum.photos/seed/flr1/900/900", "https://picsum.photos/seed/flr2/900/900"],
  ["https://picsum.photos/seed/sky1/900/900"],
  ["https://picsum.photos/seed/prk1/900/900"],
  ["https://picsum.photos/seed/dst1/900/900", "https://picsum.photos/seed/dst2/900/900", "https://picsum.photos/seed/dst3/900/900"],
];

const STORY_IMAGES = [
  "https://picsum.photos/seed/st1/600/1067",
  "https://picsum.photos/seed/st2/600/1067",
  "https://picsum.photos/seed/st3/600/1067",
  "https://picsum.photos/seed/st4/600/1067",
  "https://picsum.photos/seed/st5/600/1067",
  "https://picsum.photos/seed/st6/600/1067",
  "https://picsum.photos/seed/st7/600/1067",
  "https://picsum.photos/seed/st8/600/1067",
  "https://picsum.photos/seed/st9/600/1067",
  "https://picsum.photos/seed/st10/600/1067",
];

const COMMENTS = [
  "ძალიან ლამაზია! 😍", "სასწაულია! ❤️🔥", "Wow, amazing! 🙌", "Georgia 🇬🇪❤️",
  "Perfect shot! 📸", "მაგარია ძმაო! 💯", "Love this so much! 😭❤️",
  "Stunning! ✨", "ვაუუ! 🔥", "This is everything! 💫",
  "Goals! 🙏", "ლამაზია ძალიან! 🌟", "Incredible! 😮", "კაი ხარ! 👏",
  "Missing Georgia right now 😢🇬🇪", "Such a vibe! ✨", "მინდა იქ ვიყო! 🌿",
  "🔥🔥🔥", "ვარ შეყვარებული! ❤️", "incredible place!", "ვინ იცოდა 😍",
  "this is goals 🙌", "always stunning 💛", "beautiful as always! 🌸",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function avatar(seed: string, bg: string) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=${bg}`;
}

const BG_COLORS = ["b6e3f4", "ffd5dc", "c0aede", "ffdfbf", "d1f7c4", "ffeaa7", "dfe6e9", "fd79a8"];

async function main() {
  console.log("🌱 Seeding 50 virtual users...\n");
  const password = await bcrypt.hash("Password123!", 10);

  // Create all 50 users
  const created: { id: string; username: string }[] = [];
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const bg = BG_COLORS[i % BG_COLORS.length];
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { avatar: avatar(u.username, bg), bio: u.bio, name: u.name },
      create: {
        username: u.username,
        email: `${u.username.replace(/\./g, "")}@tsagagram.ge`,
        password,
        name: u.name,
        bio: u.bio,
        avatar: avatar(u.username, bg),
        verified: (u as { verified?: boolean }).verified || false,
        website: i < 8 ? `https://www.${u.username.replace(/[._]/g, "")}.ge` : undefined,
      },
    });
    created.push({ id: user.id, username: user.username });
    process.stdout.write(`✓ ${u.username}\n`);
  }

  // Get main user
  const mainUser = await prisma.user.findUnique({ where: { username: "tsaga" } });
  if (!mainUser) { console.error("tsaga user not found! Run login first."); return; }

  const allUserIds = [...created.map(u => u.id), mainUser.id];

  // Follow graph
  for (let i = 0; i < created.length; i++) {
    const u = created[i];
    // Everyone follows main user
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: u.id, followingId: mainUser.id } },
      update: {}, create: { followerId: u.id, followingId: mainUser.id },
    }).catch(() => {});
    // Main user follows everyone
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: mainUser.id, followingId: u.id } },
      update: {}, create: { followerId: mainUser.id, followingId: u.id },
    }).catch(() => {});
    // Each user follows 10-25 random others
    const followCount = randInt(10, 25);
    const targets = [...created].filter(x => x.id !== u.id).sort(() => Math.random() - 0.5).slice(0, followCount);
    for (const t of targets) {
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: u.id, followingId: t.id } },
        update: {}, create: { followerId: u.id, followingId: t.id },
      }).catch(() => {});
    }
  }
  console.log("\n✓ Follow graph built (50 users + tsaga)");

  // Create posts (3-9 per user)
  const allPostIds: string[] = [];
  for (let i = 0; i < created.length; i++) {
    const u = created[i];
    const numPosts = randInt(3, 9);
    for (let p = 0; p < numPosts; p++) {
      const imgs = IMAGES[(i * 3 + p) % IMAGES.length];
      const caption = CAPTIONS[(i + p * 2) % CAPTIONS.length];
      const daysAgo = randInt(0, 120);
      const post = await prisma.post.create({
        data: {
          userId: u.id,
          images: JSON.stringify(imgs),
          caption,
          location: rand(LOCATIONS),
          hashtags: JSON.stringify((caption.match(/#[\w\u10D0-\u10FF]+/g) || [])),
          createdAt: new Date(Date.now() - (daysAgo * 86400000 + randInt(0, 23) * 3600000)),
        },
      });
      allPostIds.push(post.id);
    }
  }
  console.log(`✓ ${allPostIds.length} posts created`);

  // Likes - popular posts get more (power law)
  for (let idx = 0; idx < allPostIds.length; idx++) {
    const postId = allPostIds[idx];
    const isPopular = idx % 7 === 0;
    const likeCount = isPopular ? randInt(15, 45) : randInt(2, 20);
    const likers = [...allUserIds].sort(() => Math.random() - 0.5).slice(0, Math.min(likeCount, allUserIds.length));
    for (const likerId of likers) {
      await prisma.like.upsert({
        where: { userId_postId: { userId: likerId, postId } },
        update: {}, create: { userId: likerId, postId },
      }).catch(() => {});
    }
  }
  console.log("✓ Likes added");

  // Comments with replies
  for (const postId of allPostIds) {
    const numComments = randInt(0, 8);
    for (let c = 0; c < numComments; c++) {
      const commenter = rand(allUserIds);
      const comment = await prisma.comment.create({
        data: {
          userId: commenter,
          postId,
          text: rand(COMMENTS),
          createdAt: new Date(Date.now() - randInt(0, 96) * 3600000),
        },
      });
      if (Math.random() > 0.55) {
        await prisma.comment.create({
          data: {
            userId: rand(allUserIds),
            postId,
            parentId: comment.id,
            text: rand(["😍😍", "exactly! 🙌", "🔥🔥", "agreed!", "გამარჯობა! ❤️", "soo true! ✨"]),
            createdAt: new Date(Date.now() - randInt(0, 48) * 3600000),
          },
        }).catch(() => {});
      }
    }
  }
  console.log("✓ Comments + replies added");

  // Stories (24h active) — most users have 1-4
  for (let i = 0; i < created.length; i++) {
    const hasStory = Math.random() > 0.25; // 75% chance of active story
    if (!hasStory) continue;
    const storyCount = randInt(1, 4);
    for (let s = 0; s < storyCount; s++) {
      await prisma.story.create({
        data: {
          userId: created[i].id,
          media: STORY_IMAGES[(i + s) % STORY_IMAGES.length],
          mediaType: "image",
          caption: Math.random() > 0.5 ? CAPTIONS[(i + s) % CAPTIONS.length].slice(0, 60) : undefined,
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(Date.now() - randInt(0, 22) * 3600000),
        },
      });
    }
  }
  console.log("✓ Stories added");

  // Saves
  for (const postId of allPostIds.sort(() => Math.random() - 0.5).slice(0, 60)) {
    const saver = rand(allUserIds);
    await prisma.save.upsert({
      where: { userId_postId: { userId: saver, postId } },
      update: {}, create: { userId: saver, postId },
    }).catch(() => {});
  }
  console.log("✓ Saves added");

  // DM conversations with tsaga
  const dmPartners = created.sort(() => Math.random() - 0.5).slice(0, 12);
  const dmTexts = [
    ["გამარჯობა! 👋", "გამარჯობა! როგორ ხარ? 😊", "კარგად, შენ? ❤️", "კარგად! ახალი პოსტი მომეწონა! 🔥"],
    ["Hey! Love your content 🙌", "Thanks so much! 💛", "When's the next post? 👀", "Soon! stay tuned 😉"],
    ["ეს ფოტო სად გადაიღე? 📸", "ყაზბეგში! must visit 🏔️", "ვიცი! მე ვიყავი 2 წლის წინ", "ახლა უკეთესია! 🌿"],
    ["Collaboration? 💼", "Yes! DM me the details 📧", "გამოვგზავნი ხვალ!", "Perfect 🙏"],
  ];
  for (let i = 0; i < dmPartners.length; i++) {
    const partner = dmPartners[i];
    const msgs = dmTexts[i % dmTexts.length];
    for (let m = 0; m < msgs.length; m++) {
      await prisma.message.create({
        data: {
          senderId: m % 2 === 0 ? partner.id : mainUser.id,
          receiverId: m % 2 === 0 ? mainUser.id : partner.id,
          text: msgs[m],
          read: m < msgs.length - 1,
          createdAt: new Date(Date.now() - (msgs.length - m) * randInt(120000, 600000)),
        },
      });
    }
  }
  console.log("✓ DM conversations added");

  // Notifications for tsaga
  for (let i = 0; i < 30; i++) {
    const sender = rand(created);
    const type = rand(["like", "like", "like", "comment", "follow", "comment"]);
    await prisma.notification.create({
      data: {
        type,
        receiverId: mainUser.id,
        senderId: sender.id,
        postId: type !== "follow" ? rand(allPostIds) : undefined,
        read: i > 8, // first 8 unread
        createdAt: new Date(Date.now() - randInt(0, 72) * 3600000),
      },
    }).catch(() => {});
  }
  console.log("✓ Notifications added");

  // Close friends
  for (const friend of created.slice(0, 6)) {
    await prisma.closeFriend.upsert({
      where: { ownerId_friendId: { ownerId: mainUser.id, friendId: friend.id } },
      update: {},
      create: { ownerId: mainUser.id, friendId: friend.id },
    }).catch(() => {});
  }

  // Notes for some users
  const noteTexts = ["გამარჯობა 👋", "working on something new ✨", "კარგი დღეა! ☀️", "listening to music 🎵", "coffee time ☕", "გავედი! 🏃"];
  for (const u of created.slice(0, 15)) {
    if (Math.random() > 0.4) {
      await prisma.note.upsert({
        where: { id: `note-${u.id}` },
        update: {},
        create: {
          id: `note-${u.id}`,
          userId: u.id,
          text: rand(noteTexts),
          expiresAt: new Date(Date.now() + 86400000),
        },
      }).catch(() => {});
    }
  }
  console.log("✓ Notes added");

  // Broadcast channel
  const ch = await prisma.broadcastChannel.upsert({
    where: { id: "tsagagram-official" },
    update: {},
    create: {
      id: "tsagagram-official",
      name: "Tsagagram Official 📢",
      description: "სიახლეები და განახლებები",
      userId: created[0].id,
    },
  }).catch(() => null);

  if (ch) {
    const bcMsgs = [
      "კეთილი იყოს თქვენი მობრძანება Tsagagram-ზე! 🇬🇪",
      "ახალი ფიჩერი: Stories Highlights! 🌟",
      "Photo Map - ნახე სად გადიღეს ფოტოები 🗺️",
      "50+ active users already! 🎉",
    ];
    for (const text of bcMsgs) {
      await prisma.broadcastMessage.create({
        data: { channelId: ch.id, userId: created[0].id, text },
      }).catch(() => {});
    }
    for (const u of created.slice(0, 20)) {
      await prisma.broadcastSub.upsert({
        where: { userId_channelId: { userId: u.id, channelId: ch.id } },
        update: {},
        create: { userId: u.id, channelId: ch.id },
      }).catch(() => {});
    }
  }
  console.log("✓ Broadcast channel added");

  const totalPosts = allPostIds.length;
  console.log(`
╔═══════════════════════════════════════════╗
║          ✅ SEED COMPLETE!                ║
╠═══════════════════════════════════════════╣
║  👥 50 virtual users created              ║
║  📸 ${totalPosts} posts with likes & comments      ║
║  📖 Stories (24h active, ~38 users)       ║
║  💬 12 DM conversations                   ║
║  🔔 30 notifications for tsaga            ║
║  📝 Notes for 15 users                    ║
╠═══════════════════════════════════════════╣
║  YOUR LOGIN:                              ║
║    email:    tsaga@tsagagram.ge           ║
║    password: tsaga123                     ║
║                                           ║
║  Test users: Password123!                 ║
╚═══════════════════════════════════════════╝`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

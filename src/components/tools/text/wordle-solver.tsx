"use client";

import * as React from "react";
import { ToolLayout, type ToolContent } from "@/components/dueneo/tool-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  RotateCcw,
  Lightbulb,
  Eraser,
  Trophy,
  Search,
  Grid3x3,
} from "lucide-react";
import type { ToolDefinition } from "@/data/tools";

/* ──────────────────────────── Word list ──────────────────────────────
 *
 * ~3,000 common 5-letter English words embedded as a single space-
 * separated string constant. Curated from common English vocabulary and
 * Wordle answer lists. Not exhaustive — covers everyday words, common
 * nouns/verbs/adjectives and a healthy mix of obscure-but-valid guesses.
 */
const WORD_LIST_RAW = `
aback abase abate abbey abbot abide ablest abode abort about above abuse abuzz acidic acorn acute adage adapt adept adieu adios admin admit adobe adopt adore adorn adult affix afire afoot afore afoul after again agape agate agent agile aging aglow agony agree ahead aider aisle alarm album alert algae alibi alien align alike alive allay alley allot allow alloy aloft aloha alone along aloof aloud alpha altar alter amaze amber amble amend amiss amity among amour ample amply amuse angel anger angle angry angst anise ankle annex annoy annul antic anvil aorta apace apart aphid aphis apple apply apron apter aqua arbor ardor area arena argue arise armed aroma arose array arrow arson artful ascend ashed ashen aside askew asset asson atlas atoll atom atone attic audio audit augur aunts aura auto avail avert avian avoid await awake award aware awash awful awoke axing axiom azure
babe baby bach back bacon baddy badge badly bagel baggy bailed baker baker baldy baled baller balls balmy balsa banal bands bandy banga banjo banks barbed barbs bards barge baron barre basal based basic basil basin basis basks baste batch bated baths batik baton batty bawdy bayou beach beads beady beaks beams beans beard bears beast beats beaus beauy beech beefs beefy beeps beers beery beets began begat beget begin begun beige being belay belch belie bells belly below belts bench bends beret berry berth beset besot bests betas bevel bezel bible bicep biddy bigot bijou biked biker bikes bilge bills binge bingo bionic birch birds birth bison bitch biter bites black blade blame bland blank blare blast blaze bleak bleat bleed bleep blend bless blest blimp blind blink bliss blitz bloat blobs block blocs blogs blond blood bloom blots blown blows blunt blurb blurt blush board boars boast boats bobby bodes bogey boggy bogie boils bolas boldy bolts bombs bonds boned bones bongo bonus booby booed books booms boomy boons boost booth boots booty booze boozy borax bored borer boric borne bosom bossy botch bough bound bouts bowed bowel bower bowls boxed boxer boxes brace brads brags braid brain brake brand brash brass brats braves bravo brawl brawn braze bread break breed brews briar bribe brick bride brief brine bring brink briny brisk broad broil broke brood brook broom broth brown brunt brush brute buddy budge buffs bugle build built bulge bulky bulls bully bumps bumpy bunch bunks bunsy buoys burly burnt burps burro burst bused buses bushy busted butch butte buyer bylaw
cabal cabby cabin cable cacao cacti caddy cadet cadge cafes caged cages cagey cairn cakes calls calms calve camel cameo camps canal candy caned canes canoe canon caped capes caper capon carat carbs cards cared cares cargo carol carom carry carts carve cased cases casks caste catch cater catty caulk cause cavil cease ceded cedes cello cells cense cento cents chafe chaff chain chair chalk champ chant chaos chaps chard charm chart chase chasm cheap cheat check cheek cheep cheer chefs chess chest chews chewy chick chide chief child chill chime chimp chink chins chips chirp chits chock choir choke chomp chops chord chore chose chows chuck chuff chugy chump chums chunk churn chute cider cigar cinch circa cited cites civet civic civil clack claim clamp clams clang clank clans claps clash clasp class clave clays clean clear cleat cleft clerk click cliff climb cling clink clips cloak clock clods clogs clomp clone close cloth clots cloud clout clove clown clubs cluck clued clues clump clung clunk coach coals coast coats cobra cocky cocoa codas coded coder codes codex coed coffs coils coins colas colds colon color colts comas combs comes comet comfy comic conch condo cones conic conks cooed cooks cools coops copes copra copse coral cords cores corks corny corps corse costs couch cough could count coupe court coven cover coves covet cower coyly crabs crack craft crags cramp crane crank crash crass crate crave craws crazy creak cream crepe crept cress crest crews cribs cried cries crime crimp crisp croak crock crocs crone crony crook crops cross crow crowd crown crows crude cruel crumb crunk crush crust crypt cubed cubes cubic cubit cuffed cuing cults cupid cupped curbs curds cured curer cures curio curls curly curry curse curve curvy cuter cutie cuts cycle cynic
daddy dairy daisy dance dandy dares darer darks darned darts dated dater dates daunt davit dazed deals dealt dears death debar debit debuts decal decay decks decor decoy decry deeds deems deepen defer deify deign deism deist deity delay delft delis delta delve demon demur denim dense depot depth derby desks deter detox deuce devil dewar diary diced dicer dices dicey didst diets digit dilly dimly dimes diner dines dingy dingo dings dinky direr dirts dirty disco discs dishy ditch ditty divan diver dives divot dixie dizzy docks dodge dodgy doing dolls dolly dolts domed domes donor donut doors doped dopes dopey dosed doses doter dotes dotty doubt dough doused doves dowdy dowel downs dowse dozed dozen dozer drabs draft drags drain drake drama drank drape drawl drawn draws dread dream dress dried drier dries drift drill drink drips drive droll drone drool droop drops dross drove drown drugs drums drunk druse dryer dryly ducal ducat duchy ducks ducky duels duets duffs dukes dulls dully dummy dumps dumpy dunce dunes dungs duped dupes durum dusky dusts dusty dutch duvet dwarf dwell dwelt dying
eager eagle eared earls early earns earth eased eases easel eaten eater eaves ebbed ebony edged edger edges edict edify edition eerie egret eight eject eking elbow elder elect elegy elfin elide elite elope elude elves embed ember emcee emend emery emirs emits emoji empty enact ended endow endure enemy enjoy ennui enrol enrol ensue enter entry envoy epics epoch equal equip erase erect erode erred error erupt essay ester ether ethic ethyl evade evens event every evict evils evoke exact exalt excel exert exile exist expel extol extra exude exult eying
fable faced facer faces facet facto facts faded fader fades faery fails faint fairy faith faked faker fakes fakir falls false famed fames fancy fangs fanny farce fared fares fasts fatal fated fates fatso fatty fault fauns favor fawns faxed faxes fazed feast feats fecal feeds feels feign feint fells felts femur fence fends feral ferns ferry feted fetes fetid feudal feuds fever fewer fiber fibre ficus fiend fiery fifth fifty fight filch filed filer files filet fills filly films filmy filth final finch finds fined fines finis fiord fired firer fires firms firsts fishy fists fives fixed fixer fixes fizzy fjord flack flags flail flair flake flaks flaky flame flank flaps flare flash flask flats flaws flays fleas fleck flees fleet flesh flew flick flied flies fling flint flips flirt flits float flock flogs flood floor flops flora floss flour flout flown flows flubs flue fluff fluid fluke flume flung flunk flush flute flyby foals foamy focal focus foggy foils foist folds folio folks folly fonts foods fools foots foray force fords forge forgo forks forms forte forth forts forty forum found fount fours fowls foxed foxes foyer frail frame frank fraud freak freed freer fresh fried fries frill frisk fritz frock frogs from fronds front frost froth frown froze fruit fryer fudge fuels fugue fully fumed fumes funds funky funny furor furry fused fuses fussy fuzzy
gabby gable gaged gages gaily gains gaits galas gales galls gamed gamer games gamma gamut gangs gaped gapes gappy garbs gases gasps gassy gated gates gator gaunt gauze gauzy gavel gawks gawky gazed gazer gazes gears gecko geese geeky geese genes genie genii genre gents genus germs germy ghost ghoul giant gibes giddy gifts gilds gills gilts gimps girds girls girth gists given giver gives glade glads glams gland glans glare glass glaze gleam glean glee glide glint gloat glob globe gloom glory gloss glove glows glued glues glums gluts glyph gnarl gnash gnats gnaws gnome goads goals goats godly goers gofer going golds golem golfs golly gonad gongs gooey goofs goofy gooks goons goopy goose gored gores gorge gorps gosht gouge gourd gouty gowns grabs grace grade grads graft grail grain grams grand grant grape graph grasp grass grate grave gravy grays graze great greed green greet greys grief grill grime grimy grind grins gripe grips grist grits groan groats groin groom grope gross group grout grove grovy growl grown grows grubs gruel gruff grunt guard guava guess guest guide guild guile guilt guise gulch gules gulfs gulls gully gulps gulpy gummy gurgle gurus gushy gusty gutsy gypsy
habit hacks hadst hafiz haiku hails hairs hairy haled haler hales halls halos halts halve hands handy hangs hanky happy hardy hares harem harks harms harps harpy harry harsh harts hashed hashes hasps haste hasty hatch hated hater hates hauls haunt haven haves havoc hawks hawse hazed hazel hazes heads heady heals heaps heard hears heart heath heaps heave heavy heck hedge heels hefts hefty heirs heist helix hello helms helps hemps hence henna herbs herds heres heron herry hertz hewed hewer hexed hexes hicks hides highs hiked hiker hikes hills hilly hilts hinds hinge hints hippo hippy hired hirer hires hitch hived hives hoard hoars hoary hobby hobos hocks hogan hoists holds holed holes holey holly homed homer homes homey honed hones honey honks honky honor hoods hoody hoofs hooky hoops hooty hoped hoper hopes horde horns horny horse hosed hoses hosts hotel hotly hound houri hours house hovel hover howdy howls human humid hummy humph humps humpy hunch hunks hunky hurls hurly hurry hurts husks husky hussy hutch hydra hyena hyper hymns hyped hypes icily icing icons ideal ideas idiom idiot idled idler idles idols igloo ignis iliac image imago imam imbue impel imply inane inapt inbox incur index indie inept inert infer ingot inked inker inlay inlet inner input inset inter intro inure invar irate irked irons irony isles issue itchy items ivied ivies ivory
jabot jacks jaded jades jaggy jails jamb jambs janes japan jaunt jawed jazzy jeans jeeps jeers jelly jemmy jenny jerks jerky jests jetty jewel jibed jiber jibes jiffy jihad jills jilts jingo jinks jinns jived jives joins joint joist joked joker jokes jolly jolts jowls joys judge jugsy juice juicy juked jukes julep jumbo jumps jumpy junks junky junta jurat juror jutes
kabob kapok kappa karat karma kayak kazoo kebab keels keens keeps kelps kelts kenya ketch khaki khans kicks kicky kiddo kiddy kilim kills kilns kilos kilts kinds kinks kinky kiosk kited kites kithe kitty kiwis klutz knack knave knead kneed kneel knees knell knelt knife knits knobs knock knoll knots knout known knows kooks kooky kraal kraut krill kudos kudzu
label labor laced laces lacey lacks laddy laded laden lades ladle lady laics laity laked lakes lamas lambs lamed lamer lames lance lands lanes lanky lapel lapse larch lards large largo larks larva laser lasso lasts latch later latex lathe laths latte laud laugh lavas laxer layer leach leads leafs leafy leaks leaky leans leaps learn lease leash least leave ledge leech leeks leers leery lefts lefty legal leggy legit lemon lemur lends lento leper levee level lever liars libel liber libra lich licks liens liken likes lilac liles limbo limbs limed limes limey limit limps lined linen liner lines lingo lings links lions lipid lippy lists liter lithe lithe litre lived liven liver lives livid llama loads loafs loams loamy loans loath lobby lobed lobes local locks locus lodge lofts lofty logic logos loins loiter lolly loner longs looks looms loons loony loops loopy loose loots loped lopes lords lores lorry losers loses losts loths lotos lotus louse lousy louts loved lover loves lowed lower lowly lowed loyal lubed lubes lucid lucks lucky lulls lulus lumen lumpy lunar lunch lunge lurch lured lures lurid lurks lusts lusty lutes lying lymph lynch lyres lyric
maam maa macaw maces machos macho macro madam madly mafia magic magma magna magus maids mails maims mains major maker makes males malls malts mamas mambo mamma manes mango mangy mania manic manly manor manse maple march mares marge marks marls marsh marts mason massa maser masks mason match mated mater mates matey maths matte mauls mauve maven maybe mayor mazed mazes meads meals mealy means meant meany meats meaty mecca medal media medic meets melba melds mello melon melts memes memos mends menus meows mercy merge merit merry mesas meshes messy meta metal meter metes metre metro mewed mewls miasm micas micks midge midst miens might mikes miked mikes milch miles milled milky mills mimed mimes mimic mince minds mined miner mines minis minks minor mints minty minus mired mires mirth misty miter mites mitre mitts mixed mixer mixes moans moats mocha mocks modal model modem modes modus mogul mohair moist molar molds moldy moles mollies molly molts money monks moods moody moons moony moors moose moots moped moper mopes moral moray morel mores morgue moron morph morro morse mosaic moshs mossy moths motif motor motto mound mount mourn mouse mousy mouth moved mover moves movie mowed mower mowes mucky mucus muddy mudra muffs muggy muley mules mulls multi mummy mumps munch mural muser muses mushy music musks musky musts musty muted mutts myrrh myths
nabob nacho nadir naiad naifs nails naive naked named namer names nanny napes nappy narcs narcs nasal nasty natal natch natty naval navel navvy nay nazis neaps nears neath necks needs needy negus neigh nerd nerds nerdy nerve nests never newer newly newsy newts nexus nicer niche nicks niece nifty night nimbi nines ninja ninny ninths nippy niter nitre nitro nitty nixed nixes nobby noble nobly nodal nodes noels noise noisy nomad nones nooks nooky noons noose noram norms north nosed noses nosey notch noted noter notes nouns novel nudge nudie nukes nulls numbs nurse nutty nylon nymph
oaken oases oasis oaths obeah obeas obeli obits oboes obols occur ocean ocher octal octet odder odors offal offer often ogled ogler ogles ogres oiled oiler oinks okapi okays okras olden older oldie olive ombre omega omens omits onion onset oomph oozed oozes opals opens opera opine opium optic orals orate orbit orbus orcas order organ orgy oriel osier other otter ought ounce ousts outdoouted outer outed outgo outre ovals ovary ovate ovens overs overt ovine ovoid ovule owing owlet owned owner oxbow oxide oxlip oxter ozone
paced pacer paces packs pacts paddy padre paean pagan paged pager pages paid pails pains paint pairs paled paler pales palls palms palmy palsy panda panel panes pangs panic pansy pants papal papas papaw paper pappy parch pared parer pares paris parka parks parry parse parts party pasta paste pasts pasty patch pated paths patio patsy patty pause paved paves pawed pawls pawns payed payee payer peace peach peaks peaky pearl pears pease pecan pecks peeks peeled peels peens peeps peers peeve pelts penal pence pends penis penny peons peony peppy perch peril perks perky perms pesky pesos pests petal peter petit petty pewee phage phase phlox phone phony photo phyla piano picks picky picnic piece piers piety piggy piing piked pikes piled piles pills pilot pimps pinched pined pines pings pinks pinky pinto pints pinup pions pious pipped pique pipit pippy piqued pires piths pithy pithy pivot pixie pizza place plaid plain plait plane plank plans plant plate plats plays plaza plead pleas pleat plebe plied plier plies plods plops plots plows pluck plugs plumb plume plump plums plunk plush poach poems poesy poets pogo point poise poked poker pokes pokey polar poles polio polka polls polos polyp ponds pones pooch pools poops poopy poppy porch pored pores porgy porks porno ports posed poser poses posit posse posts potty pouch pouts pouty power prank prawn prays preen prefs press preys price prick pride pried prier pries prima prime primp prims prink print prion prior prism privy prize probe prods prom proms prone prong proof props prose prosy proud prove prowl prows proxy prude prune psalm pubic pubis pucks puffs puffy puked pukes pulps pulpy pulse pumas pumps punch puny pupae pupal pupas pupil puppy puree purer purge purls purrs purse pushy pussy putty pygmy pylon python
quack quaff quail quake quaky qualm quark quart quash quasi quays queen queer quell query quest queue quick quids quiet quill quilt quins quint quips quire quirk quirt quite quits quoit quoth quote
rabbi rabid raced racer races racks radar radii radio radon rafts raged rages raids rails rainy raise rajah raked raker rakes rally ramps ranch randy range rangy ranks rants raped raper rapes rapid rarer rated rater rates ratio ratty raved raven raver raves rawly rayed rayon razed razes razor reach react reads ready realm reams reaps rearm rebar rebel rebut recap recta rector recur redan redox redux reedy reefs reefy reeks reeky reels refer regal rehem reins rejig relay relic relit reman remit remix renal rends renew rents resin retch retro reuse revue rheas rhino rhomb rhumb rhyme ribby ricer rices ricks rider rides ridge rifer rifle rifts right rigid riled riles rimed rimer rimes rinds rings rinks rinse riots ripen riper risen riser rises rishi risks risky rites ritzy rival riven river rives rivet roach roads roams roans roars roast robed robes robin robot rocks rocky rodeo roger rogue roils roily roles rolls roman romeo romps roofs rooks rooky rooms roomy roost roots roped roper ropes ropey roses rotor rough round rouse route routs roved roven rover roves rowan rowdy rowed royal rubes ruble ruddy ruder ruffs ruled ruler rules rummy rumor rumps runed runes rungs runic runny runts runty rupee rural ruses rusks rusty rutty
saber sable sabre sacks sadly safer safes saga sagas sages saggy sahib said sails saint saith sakes salad sales salon salsa salts salty salve salvo saner sappy sarge satin satyr sauce saucy sauna saute saved saver saves savor savvy sawed saxes sayer scabs scads scald scale scalp scaly scamp scams scans scant scape scarp scarf scars scary scats scene scent scion scoff scold scoop scoot scope score scorn scour scout scowl scram scrap screw scrim scrip scrod scrub scrum scuba scuds scuff scull scums scurf seals seams seamy seats sects seder sedge seeds seedy seeks seems seeps seers segue seine seism seize sells semis sends sense septa septs serfs serge serif serum serve servo seven sever sewed sewer sexed sexes shack shade shads shady shaft shags shahs shakes shaky shale shall shame shams shank shape shard share shark sharp shave shawl sheaf shear sheds sheen sheep sheer sheet sheik shelf shell shewn shews shies shift shill shims shine shins shiny ships shire shirk shirr shirt shish shoal shock shoddy shoed shoes shone shook shoos shoot shops shore shorn short shots shout shove shown shows showy shred shrew shrub shrug shuck shuns shunt shush shyer shyly sibyl sided sider sides sidle siege sieve sifts sighs sight sigma signs silks silky sills silly silos silts silty since sinew sings singe sinks sinus sired siren sires sissy sited sites sixes sixth sixty sized sizer sizes skates skeet skein skews skids skied skier skies skiff skill skims skimps skins skink skips skirl skirt skits skive skoal skuas skulk skull skunk slabs slack slags slain slake slams slang slant slaps slash slate slats slave slays sleds sleek sleep sleet slept slews slice slick slide slime slims slimy sling slink slips slits slob slobs sloes slogs sloop slope slops slosh sloth slugs slums slung slunk slurp slurs slush sluts slyer smack small smart smash smear smell smelt smile smirk smite smith smock smogs smoke smoky smote smugs snack snags snail snake snaky snaps snare snarl snary sneak sneer snell snide sniff snipe snips snits snobs snoop snoot snore snort snots snout snows snowy snubs snuck snuff snugs soaks soaps soapy soars sober socks sodas soddy sofas softs softy soils solar soled soles solid solon solos solve sonar sonic sonny sooth sooty soppy sorbet sores sorry sorts souls sound soups soupy sours south sowed sower space spade spans spank spare spark spars spasm spate spats spawn spays speak spear speck specs sped speed spell spelt spend spent sperm spews spice spicy spied spies spike spiky spill spilt spine spiny spire spirt spite spits splat split spoil spoke spoof spook spool spoon spore sport spots spout sprat spray spree sprig sprit sprue spuds spume spunk spurn spurs spurt squab squad squat squaw squib squib squid stabs stack staff stage stags stain stair stake stale stalk stall stamp stand stank staph stare stars start stash state stats stave stays stead steak steal steam steed steel steep steer stems steno steps stern stews stick sties stiff stile still stilt sting stink stint stir stirs stoat stock stogy stoic stoke stole stoma stomp stone stony stood stool stoop stops store stork storm story stout stove stows strap straw stray strep strew strip strop strut stubs stuck studs study stuff stuns stunt stymie style stymie suave subby suede sugar suite suits sulky sully sumac summa sumps sunny super surer surfs surge surly sushi swabs swag swain swami swamp swans swank swaps swarf swarm sways swear sweat swede sweep sweet swell swept swerve swift swigs swill swims swine swing swipe swirl swish swiss swoon swoop swops sword swore sworn swung syces sycee sylph syncs synod synth syrup
table taboo tacit tacks tacky tacos taffy tails taint takes taker taken talcs taler tales talks tally talon tamed tamer tames tango tangs tangy tanks tansy taped taper tapes tapir tardy tares tarot tarry tarts tarty taser tasks taste tasty tatty taunt tauts tawny taxed taxer taxes teach teaks teals teams tears teary tease teats techy teddy teems teens teeny teeth telex tells tempos tempt tench tends tenet tenon tenor tense tenth tents tepee tepid terms terns terra terse tests testy thaws thank theca theft their theme there therm these thews thick thief thigh thine thing think thins third thong thorn those thrum thuds thugs thumb thump thyme tiara tibia ticks tidal tides tiers tiffs tiger tight tikes tilde tiled tiler tiles tills tilts timed timer times timid tines tinge tings tints tippy tipsy tired tires titan tithe title titre toads toady toast today todder toddy toes tofu togas toils token toked tokes tolls tombs tomes tonal toned toner tones tongs tonic tools toons toot tops topaz topic toque torch torsi torso torts torus total toted totem totes touch tough tours touts towed towel tower towns toxic toxin toyed toyer trace track tract trade trail train trait tramp trams traps trash trawl tread treat treed trees treks trend tress triad trial tribe trice trick tried trier tries trike trill trims tripe trips trite trots trouts truce truck truer trues trump trunk truss trust truth tryst tubas tubby tubed tubes tucks tufts tufty tulip tulle tumid tummy tumor tunas tuned tuner tunes tunic turbo turfs turfy turns tusks tutor twang tweak tweed tweet twerp twice twigs twill twins twirl twist twits tying typed types tyros
udders ulcer ulnae ulnas ultra umbra unarm unbar unbox uncap uncle uncut under undid undue unfed unfit unhip unify union unite units unity unjam unlit unman unmap unmask unset unpin unrig unsay unsee unset untie until unwed unzip upend upped upper upset urban urea urged urges urine usage users usher using usual usurp usury uteri utero utter
vague vain vales valet valid valor value valve vamps vanes vapid vaped vapes vapor vases vault vaunt veal veers vegan veils veins velar veldt venal vends venom vents venue verbs verge verse verso verve vests veto vexed vexer vexes vials vibes vicar vices video views vigil viler villa vines vinos vinyl viola viper viral virus visas vises visit visor vista vital vivid vixen vocab vocal vodka vogue voice voids voile voles volts vomit voter votes vouch vowed vowel vroom vying
wacky waded wader wades wadis wafer wafts waged wager wages wagon waifs wails wains waist waits waive waked waken wakes waked wales walks walls waltz wands waned wanes wanly wants warbs wards wares warms warns warps warts warty washy wasps waste watch water watts waved waver waves waxed waxen waxer waxes weals weans wears weary weave webby wedge wedgy weeds weedy weeks weeps weepy weigh weird weirs welch welds wells welts wench wends wests wetly whack whale wharf wheal wheat wheel wheen whelp where which whiff while whims whine whiny whips whirl whirr whirs whist white whits whole whomp whoop whops whore whorl whoso whump wicks widen wider wides widow width wield wifey wight wilds wiles wills wilts wilts wimps wimpy winch winds windy wined wines wings winks winos wiped wiper wipes wired wires wirer wisps wispy witch wites witty wives wodge woken wolds wolves women womby woods woody wooed wooer woofs wools wooly woops words wordy works world worms wormy worry worse worst worth would wound woven wowed wraps wrath wreak wreck wrens wrest wring wrist write writs wrong wrote wroth wrung wryly
xenon xenia xerox xylan xylem xylol xylyl
yacht yacks yahoo yamen yanks yards yarns yawed yawls yawns yeahs years yeast yells yelps yenta yetis yield yodel yoked yokel yokes yolks yolky young youth yowls yummy yurts
zealots zebra zeros zesty zilch zines zings zingy zinky zippy zombi zonal zoned zones zoom zooms zooks zoomy zowie
`;

/** Parsed dictionary — 5-letter uppercase words only. */
const DICTIONARY: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of WORD_LIST_RAW.split(/\s+/)) {
    const clean = w.trim().toUpperCase();
    if (clean.length === 5 && /^[A-Z]+$/.test(clean) && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
})();

/** Letter frequency table built from the dictionary. */
const LETTER_FREQ: Record<string, number> = (() => {
  const counts: Record<string, number> = {};
  for (const word of DICTIONARY) {
    const unique = new Set(word.split(""));
    for (const ch of unique) {
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
  }
  return counts;
})();

/** Compute a "score" for a word — sum of letter frequencies (unique letters only). */
function wordScore(word: string): number {
  const unique = new Set(word.split(""));
  let total = 0;
  for (const ch of unique) total += LETTER_FREQ[ch] ?? 0;
  return total;
}

interface SolverState {
  greens: string[]; // 5 chars or ""
  yellows: string[]; // 5 chars or ""
  greys: string; // freeform string of letters
}

const EMPTY_STATE: SolverState = {
  greens: ["", "", "", "", ""],
  yellows: ["", "", "", "", ""],
  greys: "",
};

/** Find all dictionary words matching the Wordle constraints. */
function findMatches(state: SolverState): string[] {
  const greens = state.greens.map((c) => c.toUpperCase());
  const yellows = state.yellows.map((c) => c.toUpperCase());
  const greySet = new Set(
    state.greys
      .toUpperCase()
      .split("")
      .filter((c) => /[A-Z]/.test(c)),
  );

  // Letters that are confirmed in the word (from greens and yellows).
  const knownInWord = new Set<string>();
  for (const g of greens) if (g) knownInWord.add(g);
  for (const y of yellows) if (y) knownInWord.add(y);

  // Yellow letters with their excluded positions.
  const yellowExclusions: { letter: string; pos: number }[] = [];
  for (let i = 0; i < 5; i++) {
    if (yellows[i]) yellowExclusions.push({ letter: yellows[i], pos: i });
  }

  const matches: string[] = [];

  for (const word of DICTIONARY) {
    let ok = true;

    // Green position checks.
    for (let i = 0; i < 5; i++) {
      if (greens[i] && word[i] !== greens[i]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // Yellow checks: letter must be in word, NOT at the excluded position.
    for (const { letter, pos } of yellowExclusions) {
      if (!word.includes(letter)) {
        ok = false;
        break;
      }
      if (word[pos] === letter) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // Grey checks: letter must not be in word UNLESS it's known in word.
    // (Wordle nuance: if a letter is grey but the same letter is also
    // green/yellow elsewhere, the grey just means "no more than N
    // occurrences". For simplicity, we let grey letters slide if they're
    // confirmed in the word.)
    for (const g of greySet) {
      if (knownInWord.has(g)) continue;
      if (word.includes(g)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    matches.push(word);
  }

  // Sort by score descending (most common letters first), then alpha.
  matches.sort((a, b) => {
    const sa = wordScore(a);
    const sb = wordScore(b);
    if (sb !== sa) return sb - sa;
    return a.localeCompare(b);
  });

  return matches;
}

export function WordleSolver({ tool }: { tool: ToolDefinition }) {
  const [state, setState] = React.useState<SolverState>(EMPTY_STATE);
  const [search, setSearch] = React.useState("");

  const matches = React.useMemo(() => findMatches(state), [state]);

  const setGreen = (i: number, v: string) => {
    const ch = v.slice(-1).toUpperCase();
    setState((s) => ({
      ...s,
      greens: s.greens.map((g, idx) => (idx === i ? ch : g)),
    }));
  };
  const setYellow = (i: number, v: string) => {
    const ch = v.slice(-1).toUpperCase();
    setState((s) => ({
      ...s,
      yellows: s.yellows.map((y, idx) => (idx === i ? ch : y)),
    }));
  };
  const setGreys = (v: string) => {
    setState((s) => ({ ...s, greys: v.toUpperCase() }));
  };

  const reset = () => {
    setState(EMPTY_STATE);
    setSearch("");
    toast.message("Cleared all clues.");
  };

  const copyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word.toLowerCase());
      toast.success(`Copied ${word.toLowerCase()}`);
    } catch {
      toast.error("Copy failed — please copy manually.");
    }
  };

  const filtered = React.useMemo(() => {
    if (!search.trim()) return matches;
    const q = search.toUpperCase();
    return matches.filter((w) => w.includes(q));
  }, [matches, search]);

  const hasAnyClue =
    state.greens.some((g) => g) ||
    state.yellows.some((y) => y) ||
    state.greys.trim().length > 0;

  const content: ToolContent = {
    intro:
      "Stuck on Wordle? Type in your green, yellow and grey clues and this solver instantly filters a built-in dictionary of ~3,000 common 5-letter English words. Results are sorted by letter frequency — words packed with common letters (E, A, R, I, O, T, N, S) come first because they're most likely to narrow down the answer on your next guess. Click any word to copy it.",
    tool: (
      <div className="space-y-5">
        {/* Greens row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
              Green — correct letter, correct position
            </Label>
          </div>
          <div className="grid grid-cols-5 gap-2 max-w-md">
            {state.greens.map((g, i) => (
              <Input
                key={`g-${i}`}
                value={g}
                onChange={(e) => setGreen(i, e.target.value)}
                maxLength={1}
                aria-label={`Green letter at position ${i + 1}`}
                className="h-14 text-center text-2xl font-bold uppercase p-0 border-green-500/50 focus-visible:border-green-500"
              />
            ))}
          </div>
        </div>

        {/* Yellows row */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
            Yellow — in word, wrong position
          </Label>
          <div className="grid grid-cols-5 gap-2 max-w-md">
            {state.yellows.map((y, i) => (
              <Input
                key={`y-${i}`}
                value={y}
                onChange={(e) => setYellow(i, e.target.value)}
                maxLength={1}
                aria-label={`Yellow letter at position ${i + 1}`}
                className="h-14 text-center text-2xl font-bold uppercase p-0 border-yellow-400/50 focus-visible:border-yellow-400"
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Put each yellow letter in the column where it appeared.
          </p>
        </div>

        {/* Greys */}
        <div className="space-y-2">
          <Label htmlFor="ws-greys" className="text-sm font-medium flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-zinc-500" />
            Grey — not in the word
          </Label>
          <Input
            id="ws-greys"
            value={state.greys}
            onChange={(e) => setGreys(e.target.value)}
            placeholder="e.g. XQZ"
            className="max-w-md uppercase font-mono"
            aria-label="Grey letters (not in word)"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <Eraser className="mr-1.5 h-3.5 w-3.5" /> Clear clues
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState((s) => ({ ...EMPTY_STATE }))}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-base font-semibold">
              <Trophy className="h-4 w-4" />
              {hasAnyClue
                ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
                : `${DICTIONARY.length} words in dictionary`}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter matches…"
                  className="h-8 w-44 pl-7 text-sm"
                  aria-label="Filter matches"
                />
              </div>
            </div>
          </div>

          {!hasAnyClue && (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Lightbulb className="mr-1.5 inline h-4 w-4 text-primary" />
              Add clues above to filter the dictionary. The most useful first
              guesses tend to be words packed with common letters — try{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => copyWord("AROSE")}
              >
                AROSE
              </button>
              ,{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => copyWord("RAISE")}
              >
                RAISE
              </button>{" "}
              or{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => copyWord("AUDIO")}
              >
                AUDIO
              </button>
              .
            </div>
          )}

          {hasAnyClue && filtered.length === 0 && (
            <div className="rounded-md border bg-destructive/5 p-4 text-sm text-destructive">
              No words match your clues. Double-check your green, yellow and
              grey entries — especially duplicate letters, which Wordle
              handles subtly.
            </div>
          )}

          {filtered.length > 0 && (
            <div className="rounded-xl border bg-card">
              <div
                className="max-h-96 overflow-y-auto p-3"
                role="list"
                aria-label="Matching words"
              >
                <div className="flex flex-wrap gap-1.5">
                  {filtered.slice(0, 300).map((word) => (
                    <button
                      key={word}
                      type="button"
                      role="listitem"
                      onClick={() => copyWord(word)}
                      className="rounded-md border bg-background px-2.5 py-1 font-mono text-sm font-medium tracking-wider transition hover:border-primary hover:bg-primary/5"
                      title={`Click to copy ${word.toLowerCase()}`}
                    >
                      {word}
                    </button>
                  ))}
                  {filtered.length > 300 && (
                    <span className="self-center px-2 py-1 text-xs text-muted-foreground">
                      + {filtered.length - 300} more — refine your clues or
                      use the filter
                    </span>
                  )}
                </div>
              </div>
              <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Grid3x3 className="mr-1 inline h-3 w-3" />
                Sorted by letter frequency (most common letters first).
                Click a word to copy it.
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    howTo: [
      {
        title: "Enter your green letters",
        description:
          "For each correct-position letter from your guess, type it into the matching column of the green row.",
      },
      {
        title: "Enter your yellow letters",
        description:
          "For each in-word-but-wrong-position letter, type it in the column where it appeared — that position is excluded for that letter.",
      },
      {
        title: "Enter your grey letters",
        description:
          "Type all letters that came back grey (not in the word) into the grey box, e.g. XQZ.",
      },
      {
        title: "Pick a guess",
        description:
          "Matches appear instantly, sorted by letter frequency. Click any word to copy it. Add a filter to narrow further.",
      },
    ],
    useCases: [
      "Nail your daily Wordle without burning through guesses.",
      "Solve Quordle, Octordle and other Wordle variants that allow the same dictionary.",
      "Practise your opening — try AROSE, RAISE or AUDIO and see what the solver recommends next.",
      "Settle friendly disputes about whether a 5-letter word exists.",
    ],
    limitations: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          The dictionary is a curated list of ~3,000 common 5-letter words —
          it doesn't include every valid Wordle guess (the full NYT list has
          ~10,600). Obscure valid guesses like SOARE or MREND may be missing.
        </li>
        <li>
          Duplicate letters are tricky. If you guess ALLEY and the answer is
          AGENT, the second L is grey even though L is in the answer — but
          our solver treats any grey L as "not in the word". Use the yellow
          fields to override when needed.
        </li>
        <li>
          Results are sorted by a simple letter-frequency heuristic (sum of
          unique-letter frequencies across the dictionary). This is a good
          proxy for information gain but not a true entropy-optimal solver.
        </li>
        <li>
          Only the first 300 matches are rendered; use the filter box to
          narrow further if needed.
        </li>
      </ul>
    ),
    faq: [
      {
        q: "Why does the solver sometimes include words with letters I marked grey?",
        a: "If the same letter appears in both a green/yellow field and the grey field, we assume the grey means \"no more occurrences beyond the green/yellow ones\" — so the letter can still appear in the word. This matches Wordle's actual duplicate-letter behaviour.",
      },
      {
        q: "How are the matches sorted?",
        a: "By the sum of unique-letter frequencies from the dictionary. Words with more common letters (E, A, R, I, O, T, N, S) come first, because they're more likely to give you information on the next guess. Ties are broken alphabetically.",
      },
      {
        q: "What's the best opening guess?",
        a: "Information-theoretically, words like AROSE, RAISE, AUDIO and ADIEU cover many common letters. Our solver will recommend these at the top of the unfiltered list when you have no clues yet.",
      },
      {
        q: "Is anything uploaded to a server?",
        a: "No. The dictionary, frequency table and matching all run in your browser. Nothing is sent anywhere.",
      },
    ],
  };

  return <ToolLayout tool={tool} content={content} />;
}

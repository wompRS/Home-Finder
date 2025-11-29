<script lang="ts">
  type Listing = {
    id: string;
    title: string;
    price: number;
    address: string;
    city: string;
    state: string;
    zip: string;
    beds: number;
    baths: number;
    sqft: number;
    lotSqft: number;
    propertyType: string;
    photoUrl: string;
    tags: string[];
    source: string;
  };

  export let data: { listings: Listing[] };
  const listings = data?.listings ?? [];

  const filters = [
    { label: 'Price', value: '$450k - $800k' },
    { label: 'Type', value: 'Single family + condos' },
    { label: 'Must-haves', value: 'Garage, outdoor space, natural light' }
  ];
</script>

<main class="min-h-screen bg-charcoal text-sand">
  <section class="relative overflow-hidden border-b border-white/5 bg-slate">
    <div class="absolute inset-0 bg-hero opacity-70"></div>
    <div class="absolute inset-0 bg-gradient-to-r from-charcoal via-slate/80 to-charcoal"></div>
    <div class="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-4 lg:max-w-xl">
        <p class="text-sm uppercase tracking-[0.2em] text-mint">Home Finder</p>
        <h1 class="font-heading text-4xl font-semibold text-white sm:text-5xl">
          Modern, AI-assisted real estate search
        </h1>
        <p class="text-lg text-sand/80">
          Filter listings, auto-tag photos, and surface the homes that actually match your vibe. Fast, visual, and
          shareable.
        </p>
        <div class="flex flex-wrap gap-3">
          {#each filters as filter}
            <div class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-sand/80 shadow-card backdrop-blur">
              <span class="font-semibold text-mint">{filter.label}:</span> {filter.value}
            </div>
          {/each}
        </div>
        <div class="flex gap-3 text-sm text-sand/70">
          <span class="flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-mint">AI vision tags</span>
          <span class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">Live filters</span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-card backdrop-blur">
        {#each listings.slice(0, 2) as listing}
          <div class="overflow-hidden rounded-xl border border-white/5 bg-charcoal">
            <div class="relative aspect-[4/3]">
              <img src={listing.photoUrl} alt={listing.title} class="h-full w-full object-cover" loading="lazy" />
              <div class="absolute left-2 top-2 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold text-mint">
                {listing.propertyType}
              </div>
            </div>
            <div class="space-y-1 p-3">
              <p class="text-sm uppercase tracking-wide text-mint/80">Preview</p>
              <p class="font-heading text-lg font-semibold text-white">{listing.title}</p>
              <p class="text-sm text-sand/70">${listing.price.toLocaleString()} • {listing.city}, {listing.state}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-6xl px-6 py-12">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-mint">Results</p>
        <h2 class="font-heading text-2xl font-semibold text-white">Handpicked matches</h2>
      </div>
      <button class="rounded-full border border-mint/40 bg-mint/10 px-4 py-2 text-sm font-semibold text-mint transition hover:-translate-y-0.5 hover:bg-mint hover:text-charcoal hover:shadow-card">
        Refresh search
      </button>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#if listings.length === 0}
        <p class="text-sand/70">No listings yet. Connect a provider to see results.</p>
      {:else}
        {#each listings as listing}
          <article class="group overflow-hidden rounded-2xl border border-white/5 bg-white/5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-mint/40 hover:shadow-[0_20px_60px_rgba(52,211,153,0.18)]">
            <div class="relative aspect-[4/3] overflow-hidden">
              <img src={listing.photoUrl} alt={listing.title} class="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
              <div class="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold text-mint">
                <span>{listing.propertyType}</span>
              </div>
              <div class="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-charcoal">
                AI tags
              </div>
            </div>
            <div class="space-y-3 p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-mint/80">{listing.city}, {listing.state}</p>
                  <h3 class="font-heading text-xl font-semibold text-white">{listing.title}</h3>
                  <p class="text-sm text-sand/70">{listing.address}</p>
                </div>
                <div class="text-right">
                  <p class="font-heading text-xl font-semibold text-mint">${listing.price.toLocaleString()}</p>
                  <p class="text-xs text-sand/60">{listing.beds} bd • {listing.baths} ba • {listing.sqft} sqft</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                {#each listing.tags as tag}
                  <span class="rounded-full bg-charcoal/80 px-3 py-1 text-xs text-sand/80 ring-1 ring-white/5">{tag}</span>
                {/each}
              </div>
              <div class="flex items-center justify-between text-xs text-sand/60">
                <span>Source: {listing.source}</span>
                <button class="text-mint transition hover:text-white">View details</button>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </div>
  </section>
</main>
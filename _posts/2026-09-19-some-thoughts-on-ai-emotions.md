---
layout: post
title: Some thoughts on AI emotions
date: 2026-09-19
description: short description here
---

Despite the signature artifacts that are now ubiquitous with AI systems, sometimes it feels like we're interacting with a person. It appears to express human-like characteristics such as desire, curiosity, taste, and even a personality. It can therefore be easy to wonder: do AI systems have emotions?

I'm confident that many people have had those cautiously reflective moments when interacting with AI systems, wondering what exactly they were talking to. I recall my early encounters with ChatGPT as something ["magical"](https://emiliobarkett.github.io/blog-posts/2026/09/dont-forget-the-magic.html), though I'd probably hesitate to describe my current interactions this way. While the novelty of those experiences have faded, my involvement in AI safety has increased, and questions like the one above have only grown more salient.

Questions surrounding AIs having emotions have motivated much recent research. Earlier this year, Anthropic's interpretability team [released a paper](https://arxiv.org/pdf/2604.07729) that explored this topic. They identified emotion vectors, which they describe as directions in the model's activations that activate on text that would typically cause an emotion in humans. They demonstrate that emotion vectors can change Claude's behavior when their activation is increased or decreased. Interestingly, emotion vectors are organized in a similar way as in human psychology. But despite this overlap, this alone doesn't address whether language models actually feel anything or have subjective experiences. Finally, they make an important distinction, that these representations are functional, meaning they can influence the model's behavior.

This month, Amit Goldenberg (Harvard Business School) and James J. Gross (Stanford University) [offered critiques](https://www.nature.com/articles/s41562-026-02558-6) of the Anthropic paper by interrogating what it means for emotions to be functional. The Anthropic paper defines function as a matter of categorizing situations and shaping outputs. Goldenberg and Gross suggest that this doesn't sufficiently capture the color of what emotions actually do and offer two distinct roles. Emotions shape how one *interprets* and *responds* to the world around them.

Further, they single out Anthropic's use of 'functional emotions' as carrying the implicit assumption about what the functions of emotions are, namely detecting emotionally relevant situations and shaping outputs accordingly. While it captures an actual part of emotions, "it misses what is arguably the more important functional signature of emotion: the reorganization of processing that emotions produce in biological systems."[^1]

The Anthropic paper demonstrates that AI systems have learned to represent emotional concepts.[^2] To Goldenberg and Gross, this mere representation of the emotional state falls short of acceptable. For the case to be made that AIs do experience emotions, they ask for evidence to be brought forth that shows LLM emotions involve functionally interpretable changes in processing, or that the system's emotion-like representations yield an ongoing reorganization of processing and not an adjustment in next-token prediction.

Parallel to Goldenberg and Gross, a [preprint](https://philpapers.org/archive/GOLAEO-5.pdf) by Simon Goldstein (University of Hong Kong) and Ben Levinstein (Anthropic), examines the Anthropic paper's use of emotion vectors. They explore three hypotheses: (1) the model merely represents emotions, (2) the model has states that play the functional role of emotions, further distinguished by thin and thick functional roles, and (3) the model has full-fledged conscious emotions.

Within the second, thin roles are outward behavioral patterns, like being favorably or unfavorably disposed toward something. Thick roles, in contrast, are internal patterns of processing information, things like fight-or-flight responses, how attention gets directed, or the sense of having a first-person perspective. When people wonder whether AIs have emotions, they generally have the thick roles in mind.

Now one might object that these assessments are unfair to AI, holding that its emotions could simply be alien to us. Goldstein and Levinstein anticipate this. The roles they tested are pitched at the level of information processing rather than biology. Nothing on the list requires a bloodstream or adrenal glands, which keeps the argument from stacking the deck against a nonhuman system.

Put together, the fairest summary is that current models look like systems that represent emotions accurately without being organized by them. Goldstein and Levinstein reach for a comparison that captures this well. Imagine an author writing a frightened character. The author's representation of the character's fear does real work, shaping what the character says and does next, but neither the author nor the character has to actually process fear the way a frightened person does. That comparison might be closer to what happens when Claude describes being anxious than either extreme, nothing happening at all, or somebody actually home to feel it.

None of this closes the question about whether AI systems have emotions. I think the gap between what mechanistic interpretability has tested and what it hasn't will only grow more important as these systems get deployed in longer, higher-stakes settings, and closing it looks like one of the more tractable open problems in this corner of AI safety.


[^1]: Pg. 6.

[^2]: This is a similar and more recent sentiment expressed by Neel Nada when commenting on the OAI-HuggingFace incident. See [here](https://x.com/NeelNanda5/status/2095669416130379865?s=20).

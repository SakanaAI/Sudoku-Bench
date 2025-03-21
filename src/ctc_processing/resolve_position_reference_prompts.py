"""
Example video: https://youtu.be/QYjM2g-wyS0?si=eA1J_qv8BxcpIUHv
"""

example_input = """
<board>\n<r1><c1>:<value.>//\n<r1><c2>:<value.>//\n<r1><c3>:<value.>//\n<r1><c4>:<value.>//\n<r1><c5>:<value.>//\n<r1><c6>:<value.>//\n<r2><c1>:<value.>//\n<r2><c2>:<value.>//\n<r2><c3>:<value.>//\n<r2><c4>:<value.>//\n<r2><c5>:<value.>/<value5><value6>/\n<r2><c6>:<value.>//\n<r3><c1>:<value.>//\n<r3><c2>:<value.>//\n<r3><c3>:<value.>//\n<r3><c4>:<value.>/<value1><value2>/\n<r3><c5>:<value.>//\n<r3><c6>:<value.>//\n<r4><c1>:<value.>//\n<r4><c2>:<value.>//\n<r4><c3>:<value.>/<value1><value2>/\n<r4><c4>:<value.>//\n<r4><c5>:<value.>//\n<r4><c6>:<value.>//\n<r5><c1>:<value.>//\n<r5><c2>:<value.>/<value5><value6>/\n<r5><c3>:<value.>//\n<r5><c4>:<value.>//\n<r5><c5>:<value.>//\n<r5><c6>:<value.>//\n<r6><c1>:<value.>//\n<r6><c2>:<value.>//\n<r6><c3>:<value.>//\n<r6><c4>:<value.>/<value5><value6>/\n<r6><c5>:<value.>//\n<r6><c6>:<value.>//\n</board> I don't think that works at all. Goodness me. Maybe I need to be thinking about the whole total of the left-hand half of the puzzle or something. I don't really know. I'm fascinated by this. I don't know what to do. I mean, maybe I should think about the digits that don't... Yeah. W<ds><r2><c5><r3><c5><r4><c5><sl><r6><c1> and L.<ds><r6><c1><sl><r1><c6> We know...<ds><r1><c6><sl><r2><c5> I don't know. We know that E, S... S and R are 1 and 2. E is 5 or 6. W<ds><r2><c5><sl><r6><c1> and L must also<sl><r1><c6> be from 3,<cd><+><value3><r1><c6><cd><+><value3><r6><c1> 4,<cd><+><value4><r1><c6><cd><+><value4><r6><c1><cd><+><value5><r1><c6><cd><+><value5><r6><c1> 5,<cd><+><value6><r1><c6><cd><+><value6><r6><c1> 6 because they appear in the puzzle in their cells. And that means we definitely know W, E, S, L and R are 1 to 6 digits. But there's one other. Whereas for I, J, K and A... Have I missed a digit out there? T. T, I, J, K and A must include 7, 8, 9 and 0. Oh. Right.<ds><r1><c6><r6><c1><sl><r2><c5><sl><r3><c5><sl><r4><c5><sl><r4><c6> No. Can... I was just starting<ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4> to<sl><r6><c4> wonder. Yes. Sorry.<ds><r5><c2><r5><c3><r5><c4><r6><c4><sl><r3><c5> This is very<sl><r5><c3> obvious. Neither of these totals are R, S or S, R. And we know that S and R are 1 and 2. So neither<ds><r3><c5><r5><c3><sl><r2><c5> of<sl><r3><c5><sl><r4><c5> them add up<sl><r4><c6> to 21. So the cage<ds><r3><c5><r4><c5><r4><c6><sl><r3><c5><sl><r4><c5> that<sl><r4><c6> doesn't add up to 21<ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4><sl><r6><c4> here but does begin with a 2 adds up to 20. Yes. And... And therefore either I<ds><r5><c2><r5><c4><r6><c4> or T<ds><r5><c3><sl><r3><c5> is a 0. If it's T, this<ds><r3><c5><sl><r6><c3><sl><r6><c2> cage<sl><r6><c1><sl><r5><c1> also<sl><r4><c1><sl><r4><c2> adds up to 20. Is that plausible? With<ds><r4><c1><r4><c2><r5><c1><r6><c1><r6><c2><r6><c3><sl><r5><c2> a 5 or 6 there, I think it is. I don't think there's really a problem with it.<ds><r5><c2><sl><r5><c1><sl><r6><c1><sl><r6><c2><sl><r6><c3> These could be 6, 4, 3, 2, which adds up to 15.
""".strip()


example_output = """
<board>\n<r1><c1>:<value.>//\n<r1><c2>:<value.>//\n<r1><c3>:<value.>//\n<r1><c4>:<value.>//\n<r1><c5>:<value.>//\n<r1><c6>:<value.>//\n<r2><c1>:<value.>//\n<r2><c2>:<value.>//\n<r2><c3>:<value.>//\n<r2><c4>:<value.>//\n<r2><c5>:<value.>/<value5><value6>/\n<r2><c6>:<value.>//\n<r3><c1>:<value.>//\n<r3><c2>:<value.>//\n<r3><c3>:<value.>//\n<r3><c4>:<value.>/<value1><value2>/\n<r3><c5>:<value.>//\n<r3><c6>:<value.>//\n<r4><c1>:<value.>//\n<r4><c2>:<value.>//\n<r4><c3>:<value.>/<value1><value2>/\n<r4><c4>:<value.>//\n<r4><c5>:<value.>//\n<r4><c6>:<value.>//\n<r5><c1>:<value.>//\n<r5><c2>:<value.>/<value5><value6>/\n<r5><c3>:<value.>//\n<r5><c4>:<value.>//\n<r5><c5>:<value.>//\n<r5><c6>:<value.>//\n<r6><c1>:<value.>//\n<r6><c2>:<value.>//\n<r6><c3>:<value.>//\n<r6><c4>:<value.>/<value5><value6>/\n<r6><c5>:<value.>//\n<r6><c6>:<value.>//\n</board> \nI don't think that works at all. Goodness me. Maybe I need to be thinking about the whole total of the left-hand half of the puzzle or something. I don't really know. I'm fascinated by this. I don't know what to do. I mean, maybe I should think about the digits that don't... Yeah. W in row 6, column 1 <ds><r2><c5><r3><c5><r4><c5><sl><r6><c1> and L in row 1, column 6.<ds><r6><c1><sl><r1><c6> We know...<ds><r1><c6><sl><r2><c5> I don't know. We know that E in row 2, column 5, S... S and R are 1 and 2. E is 5 or 6. W in row 6, column 1 <ds><r2><c5><sl><r6><c1> and L in row 1, column 6 must also<sl><r1><c6> be from 3,<cd><+><value3><r1><c6><cd><+><value3><r6><c1> 4,<cd><+><value4><r1><c6><cd><+><value4><r6><c1><cd><+><value5><r1><c6><cd><+><value5><r6><c1> 5,<cd><+><value6><r1><c6><cd><+><value6><r6><c1> 6 because they appear in the puzzle in their cells. And that means we definitely know W, E, S, L and R are 1 to 6 digits. But there's one other. Whereas for I, J, K and A... Have I missed a digit out there? T. T, I, J, K and A must include 7, 8, 9 and 0. Oh. Right.<ds><r1><c6><r6><c1><sl><r2><c5><sl><r3><c5><sl><r4><c5><sl><r4><c6> No. Can... I was just starting<ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4> to<sl><r6><c4> wonder. Yes. Sorry.<ds><r5><c2><r5><c3><r5><c4><r6><c4><sl><r3><c5> This is very<sl><r5><c3> obvious. Neither of these totals at row 3, column 5 and row 5, column 3 are R, S or S, R. And we know that S and R are 1 and 2. So neither<ds><r3><c5><r5><c3><sl><r2><c5> of<sl><r3><c5><sl><r4><c5> them at row 2-4 column 5, and row 4 column 6 add up<sl><r4><c6> to 21. So the cage<ds><r3><c5><r4><c5><r4><c6><sl><r3><c5><sl><r4><c5> at row 2-4, column 5, row 4 column 6 that<sl><r4><c6> doesn't add up to 21<ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4><sl><r6><c4> here in row 5, columns 2-4 and row 6, column 4 but does begin with a 2 adds up to 20. Yes. And... And therefore either I at row 5 column 3<ds><r5><c2><r5><c4><r6><c4> or T at row 3 column 5<ds><r5><c3><sl><r3><c5> is a 0. If it's T, this<ds><r3><c5><sl><r6><c3><sl><r6><c2> cage<sl><r6><c1><sl><r5><c1> in row 6, columns 1-3, row 5, column 1, and row 4 column 1-2 also<sl><r4><c1><sl><r4><c2> adds up to 20. Is that plausible? With<ds><r4><c1><r4><c2><r5><c1><r6><c1><r6><c2><r6><c3><sl><r5><c2> a 5 or 6 in row 5, column 2, I think it is. I don't think there's really a problem with it.<ds><r5><c2><sl><r5><c1><sl><r6><c1><sl><r6><c2><sl><r6><c3> The cells in row 5, column 1 and row 6, columns 1-3 could be 6, 4, 3, 2, which adds up to 15.
""".strip()


instruction = """
### Task ###
You are processing a Sudoku video transcription containing both player commentary and board actions. Your task is to make the commentary more readable by replacing vague cell references (like "this cell") with explicit coordinates.

### Action Notation Format ###
The transcription contains action notations in this format:
- <sl> (select), <ds> (deselect), <vl> (value), <pm> (pencilmarks), <cd> (candidates), <cl> (clear)
- <r*> and <c*> denote row/column coordinates
- <value*> denotes values; <value.> indicates an empty cell
- <+> and <-> indicate adding/removing values
- The starting board is enclosed in <board> and </board> tags

### Your Instructions ###
1. Identify all instances where the player refers to cells without explicitly stating coordinates (e.g., "this cell", "here", "this box")
2. Replace these references with natural language descriptions of the cell coordinates
3. Keep the text natural and conversational
4. Preserve ALL original action notations exactly as they appear (<sl>, <ds>, etc.)
5. Maintain the flow of the player's commentary and reasoning
6. When multiple cells are referenced in sequence, include all coordinates
7. For references to groups of cells, specify the range (e.g., "cells in row 3, columns 4-6")

### Important Notes ###
- NEVER modify or remove any action notation tags
- Always use natural language for the added coordinates (e.g., "row 2, column 5" not "r2c5")
- Preserve ALL original content including puzzling moments and thinking aloud
- Ensure coordinates match the cells being selected or discussed in the action notations
- The goal is clarity without changing the substance of the commentary
""".strip()


prefilled_answer = """
I'll process this Sudoku transcription by replacing vague cell references with explicit coordinates while maintaining the natural conversational flow. I'll preserve all action notation tags (<sl>, <ds>, <vl>, etc.) exactly as they appear and use natural language for coordinates (e.g., "row 2, column 5"). I'll ensure all references to cells, including groups and sequences, are clearly specified with their proper coordinates. The original content, including the player's reasoning process, will remain intact.
""".strip()
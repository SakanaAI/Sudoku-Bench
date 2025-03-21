"""
Example video: https://youtu.be/QYjM2g-wyS0?si=eA1J_qv8BxcpIUHv
"""

example_input = """
<board>\n<r1><c1>:<value.>//\n<r1><c2>:<value.>//\n<r1><c3>:<value.>//\n<r1><c4>:<value.>//\n<r1><c5>:<value.>//\n<r1><c6>:<value.>//\n<r2><c1>:<value.>//\n<r2><c2>:<value.>//\n<r2><c3>:<value.>//\n<r2><c4>:<value.>//\n<r2><c5>:<value.>/<value5><value6>/\n<r2><c6>:<value.>//\n<r3><c1>:<value.>//\n<r3><c2>:<value.>//\n<r3><c3>:<value.>//\n<r3><c4>:<value.>/<value1><value2>/\n<r3><c5>:<value.>//\n<r3><c6>:<value.>//\n<r4><c1>:<value.>//\n<r4><c2>:<value.>//\n<r4><c3>:<value.>/<value1><value2>/\n<r4><c4>:<value.>//\n<r4><c5>:<value.>//\n<r4><c6>:<value.>//\n<r5><c1>:<value.>//\n<r5><c2>:<value.>/<value5><value6>/\n<r5><c3>:<value.>//\n<r5><c4>:<value.>//\n<r5><c5>:<value.>//\n<r5><c6>:<value.>//\n<r6><c1>:<value.>//\n<r6><c2>:<value.>//\n<r6><c3>:<value.>//\n<r6><c4>:<value.>/<value5><value6>/\n<r6><c5>:<value.>//\n<r6><c6>:<value.>//\n</board> \nI don't think that works at all. Goodness me. Maybe I need to be thinking about the whole total of the left-hand half of the puzzle or something. I don't really know. I'm fascinated by this. I don't know what to do. I mean, maybe I should think about the digits that don't... Yeah. W in row 6, column 1 <ds><r2><c5><r3><c5><r4><c5><sl><r6><c1> and L in row 1, column 6.<ds><r6><c1><sl><r1><c6> We know...<ds><r1><c6><sl><r2><c5> I don't know. We know that E in row 2, column 5, S... S and R are 1 and 2. E is 5 or 6. W in row 6, column 1 <ds><r2><c5><sl><r6><c1> and L in row 1, column 6 must also<sl><r1><c6> be from 3,<cd><+><value3><r1><c6><cd><+><value3><r6><c1> 4,<cd><+><value4><r1><c6><cd><+><value4><r6><c1><cd><+><value5><r1><c6><cd><+><value5><r6><c1> 5,<cd><+><value6><r1><c6><cd><+><value6><r6><c1> 6 because they appear in the puzzle in their cells. And that means we definitely know W, E, S, L and R are 1 to 6 digits. But there's one other. Whereas for I, J, K and A... Have I missed a digit out there? T. T, I, J, K and A must include 7, 8, 9 and 0. Oh. Right.<ds><r1><c6><r6><c1><sl><r2><c5><sl><r3><c5><sl><r4><c5><sl><r4><c6> No. Can... I was just starting<ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4> to<sl><r6><c4> wonder. Yes. Sorry.<ds><r5><c2><r5><c3><r5><c4><r6><c4><sl><r3><c5> This is very<sl><r5><c3> obvious. Neither of these totals at row 3, column 5 and row 5, column 3 are R, S or S, R. And we know that S and R are 1 and 2. So neither<ds><r3><c5><r5><c3><sl><r2><c5> of<sl><r3><c5><sl><r4><c5> them at row 2-4 column 5, and row 4 column 6 add up<sl><r4><c6> to 21. So the cage<ds><r3><c5><r4><c5><r4><c6><sl><r3><c5><sl><r4><c5> at row 2-4, column 5, row 4 column 6 that<sl><r4><c6> doesn't add up to 21<ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4><sl><r6><c4> here in row 5, columns 2-4 and row 6, column 4 but does begin with a 2 adds up to 20. Yes. And... And therefore either I at row 5 column 3<ds><r5><c2><r5><c4><r6><c4> or T at row 3 column 5<ds><r5><c3><sl><r3><c5> is a 0. If it's T, this<ds><r3><c5><sl><r6><c3><sl><r6><c2> cage<sl><r6><c1><sl><r5><c1> in row 6, columns 1-3, row 5, column 1, and row 4 column 1-2 also<sl><r4><c1><sl><r4><c2> adds up to 20. Is that plausible? With<ds><r4><c1><r4><c2><r5><c1><r6><c1><r6><c2><r6><c3><sl><r5><c2> a 5 or 6 in row 5, column 2, I think it is. I don't think there's really a problem with it.<ds><r5><c2><sl><r5><c1><sl><r6><c1><sl><r6><c2><sl><r6><c3> The cells in row 5, column 1 and row 6, columns 1-3 could be 6, 4, 3, 2, which adds up to 15.
""".strip()


example_output = """
<board>\n<r1><c1>:<value.>//\n<r1><c2>:<value.>//\n<r1><c3>:<value.>//\n<r1><c4>:<value.>//\n<r1><c5>:<value.>//\n<r1><c6>:<value.>//\n<r2><c1>:<value.>//\n<r2><c2>:<value.>//\n<r2><c3>:<value.>//\n<r2><c4>:<value.>//\n<r2><c5>:<value.>/<value5><value6>/\n<r2><c6>:<value.>//\n<r3><c1>:<value.>//\n<r3><c2>:<value.>//\n<r3><c3>:<value.>//\n<r3><c4>:<value.>/<value1><value2>/\n<r3><c5>:<value.>//\n<r3><c6>:<value.>//\n<r4><c1>:<value.>//\n<r4><c2>:<value.>//\n<r4><c3>:<value.>/<value1><value2>/\n<r4><c4>:<value.>//\n<r4><c5>:<value.>//\n<r4><c6>:<value.>//\n<r5><c1>:<value.>//\n<r5><c2>:<value.>/<value5><value6>/\n<r5><c3>:<value.>//\n<r5><c4>:<value.>//\n<r5><c5>:<value.>//\n<r5><c6>:<value.>//\n<r6><c1>:<value.>//\n<r6><c2>:<value.>//\n<r6><c3>:<value.>//\n<r6><c4>:<value.>/<value5><value6>/\n<r6><c5>:<value.>//\n<r6><c6>:<value.>//\n</board>

I don't think that works at all. Goodness me. Maybe I need to be thinking about the whole total of the left-hand half of the puzzle or something. I don't really know. I'm fascinated by this. I don't know what to do. I mean, maybe I should think about the digits that don't... Yeah. W in row 6, column 1 and L in row 1, column 6. <ds><r2><c5><r3><c5><r4><c5><sl><r6><c1><ds><r6><c1><sl><r1><c6>

We know... <ds><r1><c6><sl><r2><c5>

I don't know. We know that E in row 2, column 5, S... S and R are 1 and 2. E is 5 or 6. W in row 6, column 1 and L in row 1, column 6 must also be from 3, 4, 5, 6 because they appear in the puzzle in their cells. <ds><r2><c5><sl><r6><c1><sl><r1><c6><cd><+><value3><r1><c6><cd><+><value3><r6><c1><cd><+><value4><r1><c6><cd><+><value4><r6><c1><cd><+><value5><r1><c6><cd><+><value5><r6><c1><cd><+><value6><r1><c6><cd><+><value6><r6><c1>

And that means we definitely know W, E, S, L and R are 1 to 6 digits. But there's one other. Whereas for I, J, K and A... Have I missed a digit out there? T. T, I, J, K and A must include 7, 8, 9 and 0. Oh. Right. <ds><r1><c6><r6><c1><sl><r2><c5><sl><r3><c5><sl><r4><c5><sl><r4><c6>

No. Can... I was just starting to wonder. Yes. Sorry. <ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4><sl><r6><c4>

This is very obvious. Neither of these totals at row 3, column 5 and row 5, column 3 are R, S or S, R. And we know that S and R are 1 and 2. <ds><r5><c2><r5><c3><r5><c4><r6><c4><sl><r3><c5><sl><r5><c3>

So neither of them at row 2-4 column 5, and row 4 column 6 add up to 21. <ds><r3><c5><r5><c3><sl><r2><c5><sl><r3><c5><sl><r4><c5><sl><r4><c6>

So the cage at row 2-4, column 5, row 4 column 6 that doesn't add up to 21 here in row 5, columns 2-4 and row 6, column 4 but does begin with a 2 adds up to 20. Yes. <ds><r3><c5><r4><c5><r4><c6><sl><r3><c5><sl><r4><c5><sl><r4><c6><ds><r2><c5><r3><c5><r4><c5><r4><c6><sl><r5><c2><sl><r5><c3><sl><r5><c4><sl><r6><c4>

And... And therefore either I at row 5 column 3 or T at row 3 column 5 is a 0. <ds><r5><c2><r5><c4><r6><c4><ds><r5><c3><sl><r3><c5>

If it's T, this cage in row 6, columns 1-3, row 5, column 1, and row 4 column 1-2 also adds up to 20. <ds><r3><c5><sl><r6><c3><sl><r6><c2><sl><r6><c1><sl><r5><c1><sl><r4><c1><sl><r4><c2>

Is that plausible? With a 5 or 6 in row 5, column 2, I think it is. I couldn't think there's really a problem with it. <ds><r4><c1><r4><c2><r5><c1><r6><c1><r6><c2><r6><c3><sl><r5><c2>

The cells in row 5, column 1 and row 6, columns 1-3 could be 6, 4, 3, 2, which adds up to 15. <ds><r5><c2><sl><r5><c1><sl><r6><c1><sl><r6><c2><sl><r6><c3>
""".strip()


instruction = """Here is the transcription of a video that solves Sudoku. The transcription contains both the commentary from the player and the actions he made on the board.


### Transcription format explanation ###
The actions are written in a shorthand notation describing its 1) action type, 2) cell position, and 3) value.
- The action types are: <sl> (select), <ds> (deselect), <vl> (value), <pm> (pencilmarks), <cd> (candidates), <cl> (clear).
- <r*> and <c*> denote the row and column coordinates respectively.
- <value*> denotes the value of the action. In addition, <+> and <-> denote adding and removing values respectively.
- The starting board state is given at the beginning wrapped in <board> and </board>, where each cell is described with its coordinates and its state in the format "coordinates:value/candidates/pencilmarks".


### Task ###
The commentary text and the actions are interleaved in the transcription because the player explains his thought process while making the actions. I would like to move every action to the end of its corresponding commentary sentence while keeping the order of all actions, so that the transcription represents a process where the play makes a complete reasoning step and the executes it on the board. The actions should be moved to the end of the sentence where the player explains the reasoning behind the action.
- Your task is to return a transformed transcription where each action is moved to the end of the sentence where the player explains the reasoning behind the action.
- Make sure that the order of all actions remains identical in the revised transcription."""


instruction = """
You are processing transcriptions of Sudoku videos. Your task is to reorganize the transcriptions by moving actions to the end of their corresponding commentary sentences.

### Input Format ###
- The transcription contains a starting board state (enclosed in <board></board> tags) followed by interleaved commentary and actions
- Actions use notation: <sl> (select), <ds> (deselect), <vl> (value), <pm> (pencilmarks), <cd> (candidates), <cl> (clear)
- Cell positions are marked as <r*><c*> for row and column
- <value*> denotes values; <value.> indicates an empty cell
- <+> and <-> indicate adding/removing values

### Task ###
Reformat the transcription by:
1. Keeping all commentary text intact
2. Moving each action to the end of the sentence where the player explains the reasoning for that action
3. Preserving the exact order of all actions in the transcript
4. Maintaining sentence breaks in the commentary

### Expected Output ###
- The same content, but with actions repositioned to follow their corresponding commentary sentences
- All actions must appear in the same order as the original input
- The board state section should remain unchanged
""".strip()


prefilled_answer = """
I'll reorganize the Sudoku video transcriptions by moving actions to the end of their corresponding commentary sentences. I understand that I need to:

Preserve the starting board state in <board></board> tags
Keep all commentary text intact
Move each action (<sl>, <ds>, <vl>, <pm>, <cd>, <cl>) to follow the sentence explaining its reasoning
Maintain the exact original order of all actions
Preserve all sentence breaks in the commentary

I'll process your examples and actual transcriptions following this format. Feel free to provide your first transcript when ready.
""".strip()
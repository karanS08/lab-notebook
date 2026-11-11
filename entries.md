Karan's Lab Notebook
This isn't a CV. It's a log of things I built, how I thought about them, what broke, and what I learned. The entries run oldest first.
A note on the early entries: they were built before ChatGPT or Claude existed. Every bug was read, not prompted.
Index
• Entry 000: The kid who broke every toy
• Entry 001: The hot-glue arm
• Entry 002: The workshop car (brief)
• Entry 003: I learned to read errors before I learned to write code
• Entry 004: The bot that attended my classes
• Entry 005: Revisiting the hot-glue arm
• Entry 006: CanSat, or how systems get built
• Entry 007: Taiwan, part two begins
• Entry 008: A drone that lands when I make a fist
• Entry 009: A tiny satellite and a lying IMU
• Entries 010 to 016: Plaksha
• Entries 017 to 021: Sydney
Entry 000: The kid who broke every toy
When: childhood, Dharamshala
I was the first kid in my family, so I got a lot of toys as gifts. My parents still remind me what happened to every one of them. I'd play with it for two days, then break it open to get to the motors and electrical parts inside.
I made little fans out of them. Mostly, I collected the motors. That's where all of this started.
Entry 001: The hot-glue arm
When: 11th or 12th grade, around 2018–19 Cost: about ₹500 Built with: a friend, overnight
I'm from a small town, and making things wasn't something school focused on. Once I picked science and knew I wanted to do engineering, I started exploring. I learned mostly from YouTube. I was always the handy one who knew how to use every tool.
Goal: a 3DOF pick-and-place robotic arm.
What I had: no 3D printer. I had cheap SG90 servos, an Arduino Uno, an acrylic ruler cut into pieces, a hot glue gun, and two ice-cream sticks for the gripper.
What happened:
• It had almost no reach.
• The gripper couldn't really hold anything heavy.
• The servos kept coming loose, because hot glue doesn't hold under load.
Lessons:
• Hot glue is not a structural material.
• Reach is a question of torque and arm length, and cheap servos don't give you much of either.
• A gripper has to be designed, not improvised.
[photo, if one survives]
Entry 002: The workshop car (brief)
When: around the same time
I built an obstacle-avoiding RC car with an ultrasonic sensor at a workshop. It followed instructions, nothing more. I'm logging it for completeness.
Entry 003: I learned to read errors before I learned to write code
When: early college, Chandigarh University (Bachelor's in IT)
Everyone around me was learning to code. I was learning to debug. When an error came up, I didn't just Google it. I tried to understand what an indentation error or a runtime error actually meant.
That made me faster than anything else did. To be honest, I'm not a data structures person, and I can't solve complexity puzzles on my own. But I know what those structures do, and I know how to make broken code work.
Entry 004: The bot that attended my classes
When: first year of undergrad, COVID, online classes on Blackboard
Problem: I got fed up with joining every class myself.
Approach: I mapped my timetable and wrote a Python script with Selenium that opened each class automatically, on schedule.
What broke: the bot found buttons by their element names on the front end. Blackboard changed something on their side, and the whole thing collapsed.
Fixed it? No. Online classes ended about six months later, so the pandemic beat me to it.
Lesson: if you build on something you don't control, it will change without asking you.
Entry 005: Revisiting the hot-glue arm
When: second year, Chandigarh University Cost: about ₹5,000
I was in an IT department where everyone was focused on software, and I wanted hardware. We had a group project, and I asked my professor if I could work alone and build a proper 6DOF arm. I wanted to give the hot-glue arm some closure.
Problem 1: no 3D printer. My department didn't have one. I asked the dean for access again and again until he pointed me to the Kalpana Chawla Space Center (KCC), a club that had printers. There I met people who thought like me, top of their game, from every department. Many of them are still close friends.
The print: it was my first time using a 3D printer. The print took three or four days, and I sat in the lab and watched most of it. I filmed the printer. It looks a bit silly to me now, but back then it felt like magic.
[video: the printer printing]
The build: metal-gear servos and fully printed parts. Old arm against new: ₹500 and hot glue, compared with ₹5,000 and metal gears.
What it did:
• pick and place
• stacking
• computer vision head tracking: it read my head pose, and the gripper turned to stay aligned with me as I moved
[video: arm following my head]
What broke this time: the electrics. I powered the bigger servos from the Arduino, and that wasn't enough.
Lesson: big servos don't run on Arduino power. Use an external supply and share a common ground with the Arduino so the signals stay clean.
Entry 006: CanSat, or how systems get built
When: third year, first semester, through KCC Role: ground station and communications officer
We were a team of ten from aerospace, electronics, CAD, industrial design and software, all working on one problem statement.
Result: 90% in the PDR round, and 4th in India. We didn't qualify for the world championship, which stung.
What I actually learned:
• engineering standards, and how real things get built
• end-to-end system design, and what a systems engineer actually does
• how space tech and robotics connect
• how to work in a team
Up to then, I'd built whole things by myself. This is where I learned how ten people's pieces fit together into one system.
Part Two: Research
Entry 007: Taiwan
When: third year, second semester. Six months. Where: National Ilan University, Yilan, Taiwan (TEEP internship, paid research)
I was a small-town kid at a third-tier college, and I landed an international research internship. It was my first time abroad and my first time living alone. Hardly anyone spoke English, so by the end I could manage sentences in Chinese. I've lost most of it now. If I'd stayed two or three years, I think I'd be fluent.
My host professor is one of the kindest and most accommodating people I've ever worked with.
The work: a mobile robot. This was my first time with ROS, SLAM, LiDAR, navigation and path planning (A*). Before this, I didn't know how ROS worked or how you'd use it to build a robot.
Output: a poster paper at a conference in Japan. A teammate presented it there. [link]
The real discovery: making things can be a career, and that career is research. Before Taiwan, I thought a corporate job meant monotony, fixing errors, with no sense of making anything. In research, I decide what I work on, and I build things worth putting my brain into. This is where my brain opened up.
Outside the lab, I spent dinners with local students, swapped cultures, and met Indian students there too. It was the best experience of my life.
Entry 008: A drone that lands when I make a fist
When: Taiwan Hardware: DJI Tello, controlled from Python
• It followed me using head and body tracking.
• Making a fist made it land.
• Opening my hand made it take off.
This was the head-tracking idea from the 6DOF arm again, except now it flew.
[video]
Entry 009: A tiny satellite and a lying IMU
When: final undergrad project
CanSat stuck with me, so I built a tiny CubeSat-style unit. It wasn't to real dimensions, just small. [photo]
Inside: a 9DOF IMU (accelerometer, gyroscope, magnetometer) and an altimeter, in a self-contained unit that sent data over Wi-Fi.
Testing: I bounced it around and dropped it in free fall to collect data.
Ground station: I reused the telemetry software I'd built as CanSat ground station officer. A 3D model on screen tilted live with the unit, so it always showed its true orientation.
[GIF: tilt the unit, the model tilts]
Why I learned Kalman filters: I used the cheapest IMUs there are (MPU6050), and no IMU is perfect. A Kalman filter was my only option.
Lesson: cheap sensors lie. Math makes them honest.
Part Three: Plaksha
After my degree, I joined Plaksha University for about a year and a half (three semesters). I worked with Prof. Shashank Tamaskar and was a TA in robotics and automation. It was a place where something happened every day, and I learned something new every day.
Entry 010: Teaching 80 people to build a robot
Course: Intelligent Machines. Professors gave the theory lectures, and I ran the labs and seminars, mostly on my own, with PhD students helping.
Weeks 1 to 6, line follower. I sourced the parts from a vendor, built the robot myself, and wrote all the teaching material. I taught around 80 students, in four batches of 20, starting from zero:
• what a microcontroller, breadboard and jumper wire are
• how an ESP32 works
• why the ESP32's 3V line can't drive motors, and why motors need their own supply (my old arm mistake, now a lesson)
• the L293D-type motor driver
• differential drive
Weeks 7 to 12, mapping. We used the same chassis, swapped the IR sensors for a VL53L0X time-of-flight sensor (about 1 m range), and taught occupancy grids with a Bayes filter. I built a maze, and students drove the robots wirelessly to map it into a fixed grid.
Result: the maps were a mess. It was a great learning experience, and that includes for me.
Entry 011: Self-balancing robots, and why math matters
Course: Control Systems (TA)
On paper I was the TA. In reality, I was learning alongside the students: PID, LQR and MPC. I built a two-wheel balancing bot with NEMA 17 steppers and an Arduino Nano.
I was also learning statics and dynamics. It was hard. This is when I realised math isn't optional.
I worked with Prof. Andy Ruina (retired from Cornell, visiting Plaksha) on the controls and dynamics subjects.
Entry 012: A cart-pole that balances like a person
When: independent project, after Control Systems
Question: when you push someone gently, they correct with their ankles. Push harder and they step back. How do they choose?
Model: a cart and pendulum with an extra motorised joint at the base of the pole.
• small disturbance: the joint motor corrects it (the ankle)
• large disturbance: the cart moves (the step)
It's gain scheduling, picking the right actuator for the size of the problem. This idea comes back underwater later.
[simulation clip]
Entry 013: Blimps from bin bags
Course: Lighter-than-air systems, TA for visiting Prof. Rajkumar Pant (IIT Bombay)
I learned how blimps work and made hot-air balloons out of plastic bags and the materials he brought along. Everything was hands-on.
Entry 014: Redesigning a glider for 100 kids
When: a school workshop with Prof. Pant
We taught around 100 students about lift, pitch and counterbalance by building gliders. The professor's usual design worked, but it didn't scale to that many builders.
My redesign: a carbon rod and laser-cut MDF pieces for the fuselage, and Styrofoam wings. It was quick to make, repeatable, and it flew.
[photo]
Entry 015: Lasers in sugarcane juice
Project: Prof. Tamaskar's sensor for sugarcane farmers, which measures the sucrose in juice by passing a laser through it.
I worked with the lasers and designed some of the early prototypes.
Entry 016: Finding the gaps in a sugarcane field
Role: research assistant for three months under Prof. Tamaskar, funded by a CSR grant from CNH Industrial (New Holland tractors)
Field work: I learned to fly a DJI Matrice 300 to map fields, overlaid satellite data on the drone data in GIS, and analysed multispectral images.
Problem: sugarcane is grown in a nursery and transplanted after it germinates. Bald spots in a field mean lost yield.
What I built: a deep learning computer vision pipeline that finds crop gaps in drone imagery, then exports exact coordinates in a geo format. A farmer can open the result on a phone and walk to the spot that needs replanting.
Paper: on arXiv, in progress. [link]
[before and after: drone map with gaps flagged]
After this, I felt saturated. I didn't think I'd learned enough yet.
Part Four: Sydney
Entry 017: 26 February
I gave up my job and moved to Sydney for a Master of Engineering (Extension) at UTS, in Software Systems with a Robotics minor. I wanted to get everything I could out of it.
First up was Intro to Linux, a core subject and a good refresher. For the record, I live in Ubuntu. My laptop dual-boots Windows, and I open it maybe two or three times a year.
Entry 018: Pepper, and where the memory idea started
Course: Robotics Studio 2. Result: High Distinction. Robot: Pepper, a small humanoid social robot with a screen on its chest
Goal: make it interact with people as humanly as possible.
Approach:
• the person's speech goes to text, then to an LLM
• a system prompt tells the LLM who Pepper is
• Pepper gives tours and keeps a memory of each waypoint and the items there
• asked about any of it, Pepper answers straight away, with no looking things up and no "I can't do that"
What it started: two questions stuck with me. Why can't an LLM reason about where it's been? Why can't a robot remember like we do? This was my first real encounter with embodied AI.
Entry 019: The capstone, underwater
Project: AUV-7, an autonomous underwater vehicle
Question: can a supervisor switch between PID and MPC on demand? PID handles simple problems, and MPC handles the ones that need smarter control. Each has its own compute cost and weaknesses, so something has to choose well.
This is the cart-pole idea from Entry 012 again, just wetter.
The first semester went on reading the literature and pinning down the research question.
Entry 020: Space Robotics
The course outline said that if you can't do the first assignment, you should change courses, because it only gets harder. That's exactly what I wanted.
The professor built a ROS simulation from Mars rover data and set us path-planning and cave-exploration problems. It's where space and robotics, which first clicked for me in CanSat, came together again.
[clip: rover in the cave]
Entry 021: RPV-Mem, a robot that remembers what it wasn't looking for
When: began right after my first semester. About 3 months: roughly 2.5 building and 0.5 writing. With: Gavin Paul and his PhD student Adam Scicluna, UTS Target: ACRA 2026, Canberra
The human question: you search a table for your wallet and see a hundred things, including a pen. Later someone asks, "did you see a pen?" You remember it, even though you never meant to.
You also trust memories differently over time. Where a static object was a moment ago, you trust. Where it was a month ago, much less. For objects that move, the window is different again.
The idea: VLMs can see and understand a scene. So why not make the VLM the robot's brain, the top-level moderator that decides what to do, instead of stacking complex algorithms?
How it started: nobody asked me to do this. I wrote a detailed proposal and sent it to my Robotics Studio tutor. He had me send it formally and forwarded it to the professors. Gavin Paul replied and asked to meet the next day. I made the slides that night. He offered some funding, and I wanted a journal paper. He said to start slower and aim for ACRA.
Approach: I read the literature and found DAAAM, from MIT SPARK Lab. Anything I built had to sit on top of it. But building on it alone wasn't viable, so I designed my own verification gates.
The gates: every memory has a temporal decay value, with tunable weights. The robot only acts on a memory when it's confident the memory is still true.
Status: a proof of concept in simulation, and publication-ready. It hasn't been tested on a real robot yet.
Next: a real robot.


// Independent examples exercise the language features required by the lab catalog.
const main = (body) =>
  `public class Main { public static void main(String[] args) throws Exception { ${body} } }`;
const inputProgram =
  "import java.util.*; " +
  main(
    "Scanner s=new Scanner(System.in);System.out.print(s.nextInt()+s.nextInt());",
  );
export const javaLabFixtures = [
  {
    name: "Custom input: first case",
    code: inputProgram,
    stdin: "6\n9",
    expected: "15",
  },
  {
    name: "Custom input: changed values",
    code: inputProgram,
    stdin: "20 22",
    expected: "42",
  },
  {
    name: "Lab 1: primes and Scanner",
    stdin: "10",
    expected: "2 3 5 7",
    code:
      "import java.util.*; " +
      main(
        'Scanner s=new Scanner(System.in); int n=s.nextInt(); for(int i=2;i<=n;i++){boolean prime=true; for(int j=2;j*j<=i;j++) if(i%j==0)prime=false; if(prime)System.out.print(i+" ");}',
      ),
  },
  {
    name: "Lab 2: quadratic roots and printf",
    stdin: "1 -5 6",
    expected: "3.00 2.00",
    code:
      "import java.util.*; " +
      main(
        'Scanner s=new Scanner(System.in); double a=s.nextDouble(),b=s.nextDouble(),c=s.nextDouble(); double d=Math.sqrt(b*b-4*a*c);System.out.printf(Locale.ROOT,"%.2f %.2f",(-b+d)/(2*a),(-b-d)/(2*a));',
      ),
  },
  {
    name: "Lab 3: matrix arrays",
    expected: "19 22\n43 50",
    code: main(
      'int[][] a={{1,2},{3,4}},b={{5,6},{7,8}};for(int i=0;i<2;i++){for(int j=0;j<2;j++){int s=0;for(int k=0;k<2;k++)s+=a[i][k]*b[k][j];System.out.print(s+(j==0?" ":""));}System.out.println();}',
    ),
  },
  {
    name: "Lab 4: abstract and final",
    expected: "Teacher\nPrincipal",
    code:
      'abstract class Employee { abstract String role(); } class Teacher extends Employee { String role(){return "Teacher";} } final class Principal extends Employee { String role(){return "Principal";} } ' +
      main(
        "Employee[] es={new Teacher(),new Principal()};for(Employee e:es)System.out.println(e.role());",
      ),
  },
  {
    name: "Lab 5: shapes",
    expected: "20.00\n10.00\n28.27",
    code:
      "import java.util.*; abstract class Shape { abstract double area(); } class Rectangle extends Shape {double area(){return 4*5;}} class Triangle extends Shape {double area(){return 4*5/2.0;}} class Circle extends Shape {double area(){return Math.PI*9;}} " +
      main(
        'for(Shape s:new Shape[]{new Rectangle(),new Triangle(),new Circle()})System.out.printf(Locale.ROOT,"%.2f%n",s.area());',
      ),
  },
  {
    name: "Lab 6: overloads",
    expected: "1\n9\n8\n5\n6.0",
    code:
      "class Box {int w,h;Box(){this(1,1);}Box(int s){this(s,s);}Box(int a,int b){w=a;h=b;}int area(){return w*h;}static int sum(int a,int b){return a+b;}static double sum(double a,double b){return a+b;}} " +
      main(
        "System.out.println(new Box().area());System.out.println(new Box(3).area());System.out.println(new Box(2,4).area());System.out.println(Box.sum(2,3));System.out.println(Box.sum(2.5,3.5));",
      ),
  },
  {
    name: "Lab 7: overriding",
    expected: "Car\nBoat",
    code:
      'class Vehicle {String move(){return "Vehicle";}}class Car extends Vehicle {@Override String move(){return "Car";}}class Boat extends Vehicle {@Override String move(){return "Boat";}} ' +
      main(
        "for(Vehicle v:new Vehicle[]{new Car(),new Boat()})System.out.println(v.move());",
      ),
  },
  {
    name: "Lab 8: interface",
    expected: "830.00",
    code:
      "import java.util.*;interface Converter {double toINR(double x);}class Dollar implements Converter {public double toINR(double x){return x*83;}} " +
      main(
        'Converter c=new Dollar();System.out.printf(Locale.ROOT,"%.2f",c.toINR(10));',
      ),
  },
  {
    name: "Lab 9: custom exception",
    stdin: "16",
    expected: "Age must be at least 18",
    code:
      "import java.util.*;class InvalidAgeException extends Exception {} " +
      main(
        'try {if(new Scanner(System.in).nextInt()<18)throw new InvalidAgeException();System.out.print("Eligible");}catch(InvalidAgeException e){System.out.print("Age must be at least 18");}',
      ),
  },
  {
    name: "Lab 11: threads and sleep",
    expected: "4\n27",
    code: main(
      "Thread a=new Thread(()->System.out.println(2*2));a.start();a.join();Thread.sleep(10);Thread b=new Thread(()->System.out.println(3*3*3));b.start();b.join();",
    ),
  },
  {
    name: "Lab 12: producer consumer",
    expected: "1\n2\n3\n4\n5",
    code:
      "class Buffer {int n;boolean full; synchronized void put(int v)throws Exception{while(full)wait();n=v;full=true;notifyAll();} synchronized int get()throws Exception{while(!full)wait();int v=n;full=false;notifyAll();return v;}} " +
      main(
        "final Buffer b=new Buffer();Thread p=new Thread(()->{try{for(int i=1;i<=5;i++)b.put(i);}catch(Exception e){throw new RuntimeException(e);}});Thread c=new Thread(()->{try{for(int i=1;i<=5;i++)System.out.println(b.get());}catch(Exception e){throw new RuntimeException(e);}});p.start();c.start();p.join();c.join();",
      ),
  },
  {
    name: "Lab 13: file splitting",
    expected: "ABC\nDEF\nGH",
    code:
      "import java.io.*;import java.util.*; " +
      main(
        'try(FileOutputStream out=new FileOutputStream("input.txt")){out.write("ABCDEFGH".getBytes("UTF-8"));}byte[] a=new byte[8];try(FileInputStream in=new FileInputStream("input.txt")){new DataInputStream(in).readFully(a);}int pos=0;for(int i=0;i<3;i++){int len=a.length/3+(i<a.length%3?1:0);String name="input.txt.part"+(i+1);try(FileOutputStream out=new FileOutputStream(name)){out.write(a,pos,len);}byte[] part=new byte[len];try(FileInputStream in=new FileInputStream(name)){new DataInputStream(in).readFully(part);}System.out.println(new String(part,"UTF-8"));pos+=len;}',
      ),
  },
  {
    name: "Lab 14: virtual file metadata",
    expected: "true\n8\nfalse",
    code:
      "import java.io.*; " +
      main(
        'try(FileOutputStream out=new FileOutputStream("sample.txt")){out.write("ABCDEFGH".getBytes("UTF-8"));}File f=new File("sample.txt");System.out.println(f.exists());System.out.println(f.length());System.out.println(new File("missing.txt").exists());',
      ),
  },
  {
    name: "Compilation errors",
    expectedError: /ERROR|cannot|Syntax/i,
    code: main('int n = "wrong";'),
  },
  {
    name: "Runtime exceptions",
    expectedError: /ArithmeticException/,
    code: main("int zero=0;System.out.println(1/zero);"),
  },
  {
    name: "Thread exceptions",
    expectedError: /IllegalStateException/,
    code: main(
      'Thread t=new Thread(()->{throw new IllegalStateException("worker failed");});t.start();t.join();',
    ),
  },
  {
    name: "Stderr is not automatically an error",
    expected: "ok",
    code: main(
      'System.err.println("A diagnostic message");System.out.print("ok");',
    ),
  },
  {
    name: "Files are isolated between runs",
    expected: "false",
    code: main('System.out.print(new java.io.File("input.txt").exists());'),
  },
  {
    name: "EOF input",
    expected: "false",
    code:
      "import java.util.*; " +
      main("System.out.print(new Scanner(System.in).hasNext());"),
  },
  {
    name: "JavaScript bridge blocked",
    expectedError: /SecurityException|disabled/,
    code: main(`doppio.JavaScript.eval("fetch('https://example.com')");`),
  },
];
